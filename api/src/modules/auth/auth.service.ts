import { MailerService } from "@nestjs-modules/mailer";
import {
    ConflictException,
    ForbiddenException,
    Inject,
    Injectable,
    Logger,
    UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import bcrypt from "bcryptjs";
import { and, eq, gt } from "drizzle-orm";
import type { DrizzleDB } from "src/database/drizzle/drizzle.type";
import { refreshTokens, User, users } from "src/database/drizzle/schema";
import { LoginDto } from "src/modules/auth/dto/login.dto";
import { LogoutDto } from "src/modules/auth/dto/logout.dto";
import { RefreshDto } from "src/modules/auth/dto/refresh.dto";
import { RegisterDto } from "src/modules/auth/dto/register.dto";
import { TotpValidateDto } from "src/modules/auth/dto/totp.dto";
import {
    JwtExpiresIn,
    JwtPayload,
} from "src/modules/auth/strategies/jwt.strategy";
import { TotpService } from "src/modules/auth/totp.service";

interface TotpPendingPayload {
    sub: string;
    type: "totp-pending";
}

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        @Inject("DRIZZLE") private readonly db: DrizzleDB,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly mailerService: MailerService,
        private readonly totpService: TotpService,
    ) {}

    async register(dto: RegisterDto) {
        const [existingUser] = await this.db
            .select()
            .from(users)
            .where(eq(users.email, dto.email))
            .limit(1);

        if (existingUser) {
            throw new ConflictException("Email already in use");
        }

        const saltRounds = this.configService.get<number>("SALT_ROUNDS") ?? 10;
        const hashedPassword = await bcrypt.hash(dto.password, saltRounds);

        const [newUser] = await this.db
            .insert(users)
            .values({
                email: dto.email,
                password: hashedPassword,
                firstName: dto.firstName,
                lastName: dto.lastName,
            })
            .returning();

        const tokens = await this.generateTokens(
            newUser.id,
            newUser.email,
            newUser.role,
        );

        this.logger.log(`User registered: ${newUser.email}`);

        return {
            user: this.sanitizeUser(newUser),
            ...tokens,
        };
    }

    async login(dto: LoginDto) {
        const [user] = await this.db
            .select()
            .from(users)
            .where(eq(users.email, dto.email))
            .limit(1);

        if (!user) {
            throw new UnauthorizedException("Invalid credentials");
        }

        const isPasswordValid = await bcrypt.compare(
            dto.password,
            user.password,
        );

        if (!isPasswordValid) {
            throw new UnauthorizedException("Invalid credentials");
        }

        if (!user.isActive) {
            throw new UnauthorizedException("Account is deactivated");
        }

        const isTotpEnabled = await this.totpService.isTotpEnabled(user.id);

        if (isTotpEnabled) {
            const totpToken = this.generateTotpPendingToken(user.id);
            this.logger.log(`TOTP required for user: ${user.email}`);
            return { requiresTotp: true, totpToken };
        }

        const tokens = await this.generateTokens(
            user.id,
            user.email,
            user.role,
        );

        this.logger.log(`User logged in: ${user.email}`);

        return {
            user: this.sanitizeUser(user),
            ...tokens,
        };
    }

    async completeTotpLogin(dto: TotpValidateDto) {
        let payload: TotpPendingPayload;

        try {
            const totpSecret =
                this.configService.getOrThrow<string>("JWT_ACCESS_SECRET");
            payload = this.jwtService.verify<TotpPendingPayload>(
                dto.totpToken,
                { secret: totpSecret },
            );
        } catch {
            throw new UnauthorizedException("Invalid or expired TOTP token");
        }

        if (payload.type !== "totp-pending") {
            throw new UnauthorizedException("Invalid token type");
        }

        const isValid = await this.totpService.validateCode(
            payload.sub,
            dto.code,
        );

        if (!isValid) {
            throw new UnauthorizedException("Invalid TOTP code");
        }

        const [user] = await this.db
            .select()
            .from(users)
            .where(eq(users.id, payload.sub))
            .limit(1);

        if (!user?.isActive) {
            throw new UnauthorizedException("User not found or deactivated");
        }

        const tokens = await this.generateTokens(
            user.id,
            user.email,
            user.role,
        );

        this.logger.log(`TOTP login completed for user: ${user.email}`);

        return {
            user: this.sanitizeUser(user),
            ...tokens,
        };
    }

    async refresh(dto: RefreshDto) {
        const [stored] = await this.db
            .select()
            .from(refreshTokens)
            .where(
                and(
                    eq(refreshTokens.token, dto.refreshToken),
                    gt(refreshTokens.expiresAt, new Date()),
                ),
            )
            .limit(1);

        if (!stored) {
            throw new UnauthorizedException("Invalid refresh token");
        }

        const [user] = await this.db
            .select()
            .from(users)
            .where(eq(users.id, stored.userId))
            .limit(1);

        if (stored.revoked) {
            await this.db
                .delete(refreshTokens)
                .where(eq(refreshTokens.userId, stored.userId));

            this.logger.warn(
                `Revoked refresh token reuse detected for user: ${stored.userId}`,
            );

            if (user) {
                await this.mailerService
                    .sendMail({
                        to: user.email,
                        subject:
                            "⚠️ Security Alert: Revoked Refresh Token Used",
                        text: `We detected an attempt to reuse a revoked refresh token for your account. If this wasn't you, please reset your password immediately and contact support.`,
                    })
                    .catch((err) => {
                        this.logger.error(
                            "Failed to send security alert email",
                            err,
                        );
                    });
            }

            throw new ForbiddenException(
                "Security alert: revoked refresh token used",
            );
        }

        if (!user?.isActive) {
            throw new UnauthorizedException("User not found or deactivated");
        }

        await this.db
            .update(refreshTokens)
            .set({ revoked: true })
            .where(eq(refreshTokens.id, stored.id));

        const tokens = await this.generateTokens(
            user.id,
            user.email,
            user.role,
        );

        return {
            user: this.sanitizeUser(user),
            ...tokens,
        };
    }

    async logout(dto: LogoutDto) {
        await this.db
            .update(refreshTokens)
            .set({ revoked: true })
            .where(eq(refreshTokens.userId, dto.userId));

        this.logger.log(`User logged out: ${dto.userId}`);

        return { message: "Logged out successfully" };
    }

    async validateUserById(userId: string) {
        const [user] = await this.db
            .select()
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

        if (!user?.isActive) {
            return null;
        }

        return this.sanitizeUser(user);
    }

    private generateTotpPendingToken(userId: string): string {
        const secret =
            this.configService.getOrThrow<string>("JWT_ACCESS_SECRET");
        const payload: TotpPendingPayload = {
            sub: userId,
            type: "totp-pending",
        };
        return this.jwtService.sign(payload, { expiresIn: "5m", secret });
    }

    private async generateTokens(userId: string, email: string, role: string) {
        const payload: JwtPayload = { sub: userId, email, role };

        const accessExpiration = this.configService.getOrThrow<JwtExpiresIn>(
            "JWT_ACCESS_EXPIRATION",
        );

        const accessSecret =
            this.configService.getOrThrow<string>("JWT_ACCESS_SECRET");

        const accessToken = this.jwtService.sign(payload, {
            expiresIn: accessExpiration,
            secret: accessSecret,
        });

        const refreshExpiration = this.configService.getOrThrow<JwtExpiresIn>(
            "JWT_REFRESH_EXPIRATION",
        );
        const refreshSecret =
            this.configService.getOrThrow<string>("JWT_REFRESH_SECRET");

        const refreshToken = this.jwtService.sign(payload, {
            expiresIn: refreshExpiration,
            secret: refreshSecret,
        });

        const expirationDate = new Date();
        if (typeof refreshExpiration === "number") {
            expirationDate.setSeconds(
                expirationDate.getSeconds() + refreshExpiration,
            );
        } else if (refreshExpiration.endsWith("d")) {
            expirationDate.setDate(
                expirationDate.getDate() + Number.parseInt(refreshExpiration),
            );
        } else if (refreshExpiration.endsWith("h")) {
            expirationDate.setHours(
                expirationDate.getHours() + Number.parseInt(refreshExpiration),
            );
        } else if (refreshExpiration.endsWith("m")) {
            expirationDate.setMinutes(
                expirationDate.getMinutes() +
                    Number.parseInt(refreshExpiration),
            );
        }

        await this.db.insert(refreshTokens).values({
            userId,
            token: refreshToken,
            expiresAt: expirationDate,
        });

        return { accessToken, refreshToken };
    }

    private sanitizeUser(user: User) {
        return Object.fromEntries(
            Object.entries(user).filter(([key]) => key !== "password"),
        ) as Omit<User, "password">;
    }
}
