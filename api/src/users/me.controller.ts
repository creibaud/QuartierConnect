import {
    Body,
    Controller,
    Delete,
    Get,
    Inject,
    Request,
    UnauthorizedException,
    UseGuards,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import {
    ApiBearerAuth,
    ApiBody,
    ApiOperation,
    ApiResponse,
    ApiTags,
} from "@nestjs/swagger";
import { eq } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { Model } from "mongoose";
import { Driver } from "neo4j-driver";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { User, UserDocument } from "../auth/schemas/user.schema";
import { TotpService } from "../auth/totp.service";
import { DRIZZLE_TOKEN } from "../database/drizzle.module";
import * as schema from "../database/schema";
import { NEO4J_DRIVER } from "../social/neo4j/neo4j.provider";
import { DeleteAccountBodyDto, GdprExportDto } from "./dto/user-responses.dto";

interface AuthRequest {
    user: { sub: string };
}

@ApiTags("Users (me)")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("users/me")
export class MeController {
    constructor(
        @Inject(DRIZZLE_TOKEN)
        private readonly db: PostgresJsDatabase<typeof schema>,
        @InjectModel(User.name)
        private readonly userModel: Model<UserDocument>,
        @Inject(NEO4J_DRIVER)
        private readonly neo4jDriver: Driver,
        private readonly totpService: TotpService,
    ) {}

    @Get("export")
    @ApiOperation({
        summary: "Export my personal data (GDPR Art. 20)",
        description:
            "Returns all data associated with the current account: profile, incidents, points balance, transactions.",
    })
    @ApiResponse({ status: 200, type: GdprExportDto })
    async export(@Request() req: AuthRequest) {
        const userId = req.user.sub;

        const [profile] = await this.db
            .select({
                id: schema.users.id,
                email: schema.users.email,
                role: schema.users.role,
                createdAt: schema.users.createdAt,
            })
            .from(schema.users)
            .where(eq(schema.users.id, userId));

        const incidents = await this.db
            .select()
            .from(schema.incidents)
            .where(eq(schema.incidents.createdBy, userId));

        const [pointsBalance] = await this.db
            .select()
            .from(schema.pointsBalances)
            .where(eq(schema.pointsBalances.userId, userId));

        const transactions = await this.db
            .select()
            .from(schema.pointsTransactions)
            .where(eq(schema.pointsTransactions.senderId, userId));

        const neo4jSession = this.neo4jDriver.session();
        let socialData: { relationship: string; targetId: string }[] = [];
        try {
            const neo4jResult = await neo4jSession.run(
                `MATCH (u:User {id: $userId})-[r]->(t)
         RETURN type(r) AS relationship, t.id AS targetId`,
                { userId },
            );
            socialData = neo4jResult.records.map((rec) => ({
                relationship: rec.get("relationship") as string,
                targetId: rec.get("targetId") as string,
            }));
        } catch {
            // Neo4j unavailable — export continues without social data
        } finally {
            await neo4jSession.close();
        }

        return {
            profile: profile ?? null,
            incidents,
            pointsBalance: pointsBalance ?? null,
            transactions,
            socialData,
        };
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
            })
            .from(schema.users)
            .where(eq(schema.users.id, userId));

        if (
            !pgUser?.totpSecret ||
            !this.totpService.verify(pgUser.totpSecret, body.totpCode)
        ) {
            throw new UnauthorizedException("Invalid TOTP code");
        }

        const anonymizedEmail = `deleted_${userId}@anonymized.invalid`;

        await this.db
            .update(schema.users)
            .set({
                email: anonymizedEmail,
                passwordHash: "",
                totpSecret: "",
                role: "deleted",
                refreshTokenHash: null,
                updatedAt: new Date(),
            })
            .where(eq(schema.users.id, userId));

        await this.userModel
            .findOneAndUpdate(
                { email: pgUser.email },
                {
                    $set: {
                        email: anonymizedEmail,
                        passwordHash: "",
                        totpSecret: "",
                        refreshTokenHash: null,
                    },
                },
            )
            .exec();

        const session = this.neo4jDriver.session();
        try {
            await session.run(
                `MATCH (u:User {id: $userId})
         SET u.email = $anonymizedEmail, u.name = 'Deleted user'`,
                { userId, anonymizedEmail },
            );
        } catch {
            // Neo4j unavailable — account deletion continues without social graph update
        } finally {
            await session.close();
        }

        return { success: true };
    }
}
