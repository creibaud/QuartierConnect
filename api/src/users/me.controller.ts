import {
    Body,
    ConflictException,
    Controller,
    Delete,
    Get,
    Inject,
    Logger,
    Patch,
    Request,
    UnauthorizedException,
    UseGuards,
} from "@nestjs/common";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import {
    ApiBearerAuth,
    ApiBody,
    ApiOperation,
    ApiResponse,
    ApiTags,
} from "@nestjs/swagger";
import * as argon2 from "argon2";
import { eq } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { GridFSBucket, ObjectId } from "mongodb";
import { Connection, Model } from "mongoose";
import { Driver } from "neo4j-driver";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { User, UserDocument } from "../auth/schemas/user.schema";
import { TokenService } from "../auth/token.service";
import { TotpService } from "../auth/totp.service";
import { normalizePhone } from "../common/phone.util";
import { DRIZZLE_TOKEN } from "../database/drizzle.module";
import * as schema from "../database/schema";
import { NEO4J_DRIVER } from "../social/neo4j/neo4j.provider";
import {
    ChangeEmailDto,
    ChangePasswordDto,
    ChangePhoneDto,
    DeleteAccountBodyDto,
    GdprExportDto,
    UpdateProfileDto,
} from "./dto/user-responses.dto";
import { GdprExportService } from "./gdpr-export.service";

interface AuthRequest {
    user: { sub: string; jti?: string; exp?: number };
}

const PROPAGATION_MAX_ATTEMPTS = 3;

function isUniqueViolation(error: unknown): boolean {
    const pg = error as { code?: string; cause?: { code?: string } };
    return (pg.code ?? pg.cause?.code) === "23505";
}

@ApiTags("Users (me)")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("users/me")
export class MeController {
    private readonly logger = new Logger(MeController.name);
    private readonly avatarBucket: GridFSBucket;

    constructor(
        @Inject(DRIZZLE_TOKEN)
        private readonly db: PostgresJsDatabase<typeof schema>,
        @InjectModel(User.name)
        private readonly userModel: Model<UserDocument>,
        @InjectConnection()
        connection: Connection,
        @Inject(NEO4J_DRIVER)
        private readonly neo4jDriver: Driver,
        private readonly totpService: TotpService,
        private readonly tokenService: TokenService,
        private readonly gdprExportService: GdprExportService,
    ) {
        this.avatarBucket = new GridFSBucket(connection.db as never, {
            bucketName: "avatars",
        });
    }

    @Get("export")
    @ApiOperation({
        summary: "Export my personal data (GDPR Art. 20)",
        description:
            "Returns all data associated with the current account: profile, consent, incidents, points, messages sent, contracts, bookings, votes, services.",
    })
    @ApiResponse({ status: 200, type: GdprExportDto })
    async export(@Request() req: AuthRequest) {
        return this.gdprExportService.exportUserData(req.user.sub);
    }

    @Get("profile")
    @ApiOperation({ summary: "Get my profile" })
    async getProfile(@Request() req: AuthRequest) {
        const [profile] = await this.db
            .select({
                id: schema.users.id,
                email: schema.users.email,
                role: schema.users.role,
                firstName: schema.users.firstName,
                lastName: schema.users.lastName,
                avatarUrl: schema.users.avatarUrl,
                phone: schema.users.phone,
            })
            .from(schema.users)
            .where(eq(schema.users.id, req.user.sub));
        return profile ?? null;
    }

    @Patch("profile")
    @ApiOperation({ summary: "Update my profile (name, avatar)" })
    @ApiBody({ type: UpdateProfileDto })
    async updateProfile(
        @Request() req: AuthRequest,
        @Body() body: UpdateProfileDto,
    ) {
        const update: Partial<{
            firstName: string;
            lastName: string;
            updatedAt: Date;
        }> = { updatedAt: new Date() };
        if (body.firstName !== undefined) update.firstName = body.firstName;
        if (body.lastName !== undefined) update.lastName = body.lastName;

        const [profile] = await this.db
            .update(schema.users)
            .set(update)
            .where(eq(schema.users.id, req.user.sub))
            .returning({
                id: schema.users.id,
                email: schema.users.email,
                role: schema.users.role,
                firstName: schema.users.firstName,
                lastName: schema.users.lastName,
                avatarUrl: schema.users.avatarUrl,
            });
        return profile;
    }

    @Patch("password")
    @ApiOperation({
        summary: "Change my password",
        description:
            "Verifies the current password and a TOTP code, then stores the new password hash.",
    })
    @ApiBody({ type: ChangePasswordDto })
    @ApiResponse({ status: 200, schema: { example: { success: true } } })
    @ApiResponse({
        status: 401,
        description: "Current password or TOTP code is incorrect",
    })
    async changePassword(
        @Request() req: AuthRequest,
        @Body() body: ChangePasswordDto,
    ) {
        const userId = req.user.sub;
        const [user] = await this.db
            .select({
                passwordHash: schema.users.passwordHash,
                totpSecret: schema.users.totpSecret,
            })
            .from(schema.users)
            .where(eq(schema.users.id, userId));

        if (
            !user ||
            !(await argon2.verify(user.passwordHash, body.currentPassword))
        ) {
            throw new UnauthorizedException("Current password is incorrect");
        }
        this.assertValidTotp(user.totpSecret, body.totpCode);

        const passwordHash = await argon2.hash(body.newPassword);
        await this.db
            .update(schema.users)
            .set({ passwordHash, updatedAt: new Date() })
            .where(eq(schema.users.id, userId));

        return { success: true };
    }

    @Patch("email")
    @ApiOperation({
        summary: "Change my email",
        description:
            "Verifies the password and a TOTP code, updates the email everywhere it is stored (PostgreSQL, MongoDB, Neo4j) and revokes existing tokens. The user must log in again with the new email.",
    })
    @ApiBody({ type: ChangeEmailDto })
    @ApiResponse({
        status: 200,
        schema: { example: { requiresReauth: true } },
    })
    @ApiResponse({
        status: 401,
        description: "Password or TOTP code is incorrect",
    })
    @ApiResponse({ status: 409, description: "EMAIL_ALREADY_EXISTS" })
    async changeEmail(
        @Request() req: AuthRequest,
        @Body() body: ChangeEmailDto,
    ) {
        const userId = req.user.sub;
        const newEmail = body.newEmail.toLowerCase();

        const [user] = await this.db
            .select({
                email: schema.users.email,
                passwordHash: schema.users.passwordHash,
                totpSecret: schema.users.totpSecret,
            })
            .from(schema.users)
            .where(eq(schema.users.id, userId));

        if (!user || !(await argon2.verify(user.passwordHash, body.password))) {
            throw new UnauthorizedException("Password is incorrect");
        }
        this.assertValidTotp(user.totpSecret, body.totpCode);
        await this.assertEmailAvailable(newEmail, userId);

        await this.applyEmailChangeInPostgres(userId, newEmail, req.user);
        await this.propagateEmailToMongo(user.email, newEmail);
        await this.propagateEmailToNeo4j(userId, newEmail);

        return { requiresReauth: true };
    }

    @Patch("phone")
    @ApiOperation({
        summary: "Change my phone number",
        description:
            "Verifies a TOTP code, then stores the phone number (loose E.164). Omit the phone field or send null to erase it.",
    })
    @ApiBody({ type: ChangePhoneDto })
    @ApiResponse({
        status: 200,
        schema: { example: { success: true, phone: "+33612345678" } },
    })
    @ApiResponse({ status: 401, description: "TOTP code invalid or expired" })
    async changePhone(
        @Request() req: AuthRequest,
        @Body() body: ChangePhoneDto,
    ) {
        const userId = req.user.sub;
        const [user] = await this.db
            .select({ totpSecret: schema.users.totpSecret })
            .from(schema.users)
            .where(eq(schema.users.id, userId));
        this.assertValidTotp(user?.totpSecret ?? null, body.totpCode);

        const phone = normalizePhone(body.phone);
        await this.db
            .update(schema.users)
            .set({ phone, updatedAt: new Date() })
            .where(eq(schema.users.id, userId));

        return { success: true, phone };
    }

    @Delete()
    @ApiOperation({
        summary: "Delete my account (GDPR Art. 17)",
        description:
            "Anonymizes the account. Requires TOTP validation to prevent deletion via a stolen token. Email replaced by an irreversible hash, passwordHash and totpSecret erased, refreshToken revoked.",
    })
    @ApiBody({ type: DeleteAccountBodyDto })
    @ApiResponse({
        status: 200,
        schema: { example: { success: true } },
        description:
            "Account anonymized — email replaced by a hash, secrets erased",
    })
    @ApiResponse({
        status: 401,
        description: "TOTP code invalid or expired",
    })
    async deleteAccount(
        @Request() req: AuthRequest,
        @Body() body: { totpCode: string },
    ) {
        const userId = req.user.sub;

        const [pgUser] = await this.db
            .select({
                email: schema.users.email,
                totpSecret: schema.users.totpSecret,
                avatarUrl: schema.users.avatarUrl,
            })
            .from(schema.users)
            .where(eq(schema.users.id, userId));
        this.assertValidTotp(pgUser?.totpSecret ?? null, body.totpCode);

        const anonymizedEmail = `deleted_${userId}@anonymized.invalid`;

        // Erase the Mongo and Neo4j copies before the irreversible Postgres
        // flip. A transient Mongo outage then leaves a fully recoverable
        // account rather than one whose real email and secrets linger in Mongo.
        // Matching by email is deterministic, so a re-run after a crash finds
        // the already-anonymized document a no-op and still completes cleanly.
        await this.eraseMongoUser(pgUser.email, anonymizedEmail);
        await this.deleteAvatarFile(pgUser.avatarUrl);
        await this.eraseNeo4jUser(userId, anonymizedEmail);

        await this.db
            .update(schema.users)
            .set({
                email: anonymizedEmail,
                passwordHash: "",
                totpSecret: "",
                role: "deleted",
                refreshTokenHash: null,
                phone: null,
                avatarUrl: null,
                updatedAt: new Date(),
            })
            .where(eq(schema.users.id, userId));

        return { success: true };
    }

    private assertValidTotp(totpSecret: string | null, totpCode: string): void {
        if (!totpSecret || !this.totpService.verify(totpSecret, totpCode)) {
            throw new UnauthorizedException("Invalid TOTP code");
        }
    }

    private async assertEmailAvailable(
        email: string,
        userId: string,
    ): Promise<void> {
        const [owner] = await this.db
            .select({ id: schema.users.id })
            .from(schema.users)
            .where(eq(schema.users.email, email));
        if (owner && owner.id !== userId) {
            throw new ConflictException({
                code: "EMAIL_ALREADY_EXISTS",
                message: "Email already registered",
            });
        }
    }

    private async applyEmailChangeInPostgres(
        userId: string,
        newEmail: string,
        session: { jti?: string; exp?: number },
    ): Promise<void> {
        try {
            await this.db.transaction(async (tx) => {
                await tx
                    .update(schema.users)
                    .set({
                        email: newEmail,
                        refreshTokenHash: null,
                        updatedAt: new Date(),
                    })
                    .where(eq(schema.users.id, userId));
            });
        } catch (error) {
            if (isUniqueViolation(error)) {
                throw new ConflictException({
                    code: "EMAIL_ALREADY_EXISTS",
                    message: "Email already registered",
                });
            }
            throw error;
        }

        if (session.jti && session.exp) {
            await this.tokenService.revokeAccessToken(
                session.jti,
                new Date(session.exp * 1000),
            );
        }
    }

    private async propagateEmailToMongo(
        oldEmail: string,
        newEmail: string,
    ): Promise<void> {
        try {
            await this.withRetry(() =>
                this.userModel
                    .findOneAndUpdate(
                        { email: oldEmail },
                        { $set: { email: newEmail } },
                    )
                    .exec(),
            );
        } catch (error) {
            this.logger.warn(
                `Mongo email propagation failed after retries: ${error}`,
            );
        }
    }

    private async propagateEmailToNeo4j(
        userId: string,
        newEmail: string,
    ): Promise<void> {
        try {
            await this.withRetry(async () => {
                const session = this.neo4jDriver.session();
                try {
                    await session.run(
                        `MATCH (u:User {id: $userId}) SET u.email = $newEmail`,
                        { userId, newEmail },
                    );
                } finally {
                    await session.close();
                }
            });
        } catch (error) {
            this.logger.warn(
                `Neo4j email propagation failed after retries: ${error}`,
            );
        }
    }

    private async eraseMongoUser(
        oldEmail: string,
        anonymizedEmail: string,
    ): Promise<void> {
        await this.withRetry(() =>
            this.userModel
                .findOneAndUpdate(
                    { email: oldEmail },
                    {
                        $set: {
                            email: anonymizedEmail,
                            passwordHash: "",
                            totpSecret: "",
                            refreshTokenHash: null,
                        },
                    },
                )
                .exec(),
        );
    }

    private async deleteAvatarFile(avatarUrl: string | null): Promise<void> {
        const match = avatarUrl?.match(/\/users\/avatar\/([a-f0-9]{24})/i);
        if (match && ObjectId.isValid(match[1])) {
            await this.avatarBucket
                .delete(new ObjectId(match[1]))
                .catch(() => undefined);
        }
    }

    private async eraseNeo4jUser(
        userId: string,
        anonymizedEmail: string,
    ): Promise<void> {
        try {
            await this.withRetry(async () => {
                const session = this.neo4jDriver.session();
                try {
                    await session.run(
                        `MATCH (u:User {id: $userId})
             SET u.email = $anonymizedEmail, u.name = 'Deleted user'`,
                        { userId, anonymizedEmail },
                    );
                } finally {
                    await session.close();
                }
            });
        } catch (error) {
            this.logger.warn(
                `Neo4j account erasure failed after retries: ${error}`,
            );
        }
    }

    private async withRetry<T>(
        operation: () => Promise<T>,
        maxAttempts = PROPAGATION_MAX_ATTEMPTS,
    ): Promise<T> {
        let lastError: unknown;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                if (attempt < maxAttempts) {
                    await new Promise((resolve) =>
                        setTimeout(resolve, 100 * 2 ** (attempt - 1)),
                    );
                }
            }
        }
        throw lastError;
    }
}
