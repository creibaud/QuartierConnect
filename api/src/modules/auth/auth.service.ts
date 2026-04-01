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
import type { User } from "src/database/drizzle/schema";
import { LoginDto } from "src/modules/auth/dto/login.dto";
import { LogoutDto } from "src/modules/auth/dto/logout.dto";
import { RefreshDto } from "src/modules/auth/dto/refresh.dto";
import { RegisterDto } from "src/modules/auth/dto/register.dto";
import type { SsoLoginDto } from "src/modules/auth/dto/sso.dto";
import { TotpValidateDto } from "src/modules/auth/dto/totp.dto";
import type { IAuthRepository } from "src/modules/auth/auth.repository";
import {
    JwtExpiresIn,
    JwtPayload,
} from "src/modules/auth/strategies/jwt.strategy";
import { TotpService } from "src/modules/auth/totp.service";
import { OUTBOX_EVENT_TYPES } from "src/modules/outbox/outbox-event-types";
import { OutboxService } from "src/modules/outbox/outbox.service";

interface TotpPendingPayload {
    sub: string;
    type: "totp-pending";
}

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        @Inject("IAuthRepository")
        private readonly authRepository: IAuthRepository,
        private readonly outbox: OutboxService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly mailerService: MailerService,
        private readonly totpService: TotpService,
    ) {}

    async register(dto: RegisterDto) {
        const existing = await this.authRepository.findByEmail(dto.email);

        if (existing) {
            throw new ConflictException("Email already in use");
        }

        const saltRounds = this.configService.get<number>("SALT_ROUNDS") ?? 10;
        const hashedPassword = await bcrypt.hash(dto.password, saltRounds);

        const newUser = await this.authRepository.createUser({
            email: dto.email,
            password: hashedPassword,
            firstName: dto.firstName,
            lastName: dto.lastName,
        });

        await this.outbox.publish({
            aggregateType: "user",
            aggregateId: newUser.id,
            eventType: OUTBOX_EVENT_TYPES.userRegistered,
            payload: {
                id: newUser.id,
                email: newUser.email,
                firstName: newUser.firstName,
                lastName: newUser.lastName,
                role: newUser.role,
                isActive: newUser.isActive,
                createdAt: newUser.createdAt,
                updatedAt: newUser.updatedAt,
            },
        });

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
        const user = await this.authRepository.findByEmail(dto.email);

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
            const secret =
                this.configService.getOrThrow<string>("JWT_ACCESS_SECRET");
            payload = this.jwtService.verify<TotpPendingPayload>(
                dto.totpToken,
                { secret },
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

        const user = await this.authRepository.findById(payload.sub);

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
        const stored = await this.authRepository.findActiveRefreshToken(
            dto.refreshToken,
        );

        if (!stored) {
            throw new UnauthorizedException("Invalid refresh token");
        }

        const user = await this.authRepository.findById(stored.userId);

        if (stored.revoked) {
            await this.authRepository.deleteAllUserRefreshTokens(stored.userId);

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

        await this.authRepository.revokeRefreshToken(stored.id);

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

    async ssoLogin(dto: SsoLoginDto) {
        const user = await this.authRepository.findByEmail(dto.email);

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

        if (user.role !== "admin") {
            throw new ForbiddenException(
                "Only administrators can use the desktop SSO",
            );
        }

        const isTotpEnabled = await this.totpService.isTotpEnabled(user.id);

        if (isTotpEnabled) {
            if (!dto.totpCode) {
                throw new UnauthorizedException(
                    "TOTP code required for this account",
                );
            }

            const isValid = await this.totpService.validateCode(
                user.id,
                dto.totpCode,
            );

            if (!isValid) {
                throw new UnauthorizedException("Invalid TOTP code");
            }
        }

        const accessToken = this.generateDesktopAccessToken(
            user.id,
            user.email,
            user.role,
        );

        this.logger.log(`SSO desktop login for admin: ${user.email}`);

        return {
            accessToken,
            tokenType: "Bearer",
            expiresIn: 86400,
            user: { id: user.id, email: user.email, role: user.role },
        };
    }

    async logout(dto: LogoutDto) {
        await this.authRepository.revokeAllUserRefreshTokens(dto.userId);

        this.logger.log(`User logged out: ${dto.userId}`);

        return { message: "Logged out successfully" };
    }

    getRefreshCookieConfig(): {
        name: string;
        path: string;
        maxAge: number;
    } {
        const name = this.configService.getOrThrow<string>(
            "REFRESH_COOKIE_NAME",
        );
        const path = this.configService.getOrThrow<string>(
            "REFRESH_COOKIE_PATH",
        );
        const expiration = this.configService.getOrThrow<string>(
            "JWT_REFRESH_EXPIRATION",
        );
        return { name, path, maxAge: this.expirationToMs(expiration) };
    }

    async validateUserById(userId: string) {
        const user = await this.authRepository.findById(userId);

        if (!user?.isActive) {
            return null;
        }

        return this.sanitizeUser(user);
    }

    private generateDesktopAccessToken(
        userId: string,
        email: string,
        role: string,
    ): string {
        const payload: JwtPayload & { aud: string[] } = {
            sub: userId,
            email,
            role,
            aud: ["desktop"],
        };

        const accessSecret =
            this.configService.getOrThrow<string>("JWT_ACCESS_SECRET");

        return this.jwtService.sign(payload, {
            expiresIn: "24h",
            secret: accessSecret,
        });
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

        const expiresAt = this.computeExpirationDate(refreshExpiration);

        await this.authRepository.createRefreshToken({
            userId,
            token: refreshToken,
            expiresAt,
        });

        return { accessToken, refreshToken };
    }

    private computeExpirationDate(expiration: JwtExpiresIn): Date {
        const date = new Date();

        if (typeof expiration === "number") {
            date.setSeconds(date.getSeconds() + expiration);
        } else if (expiration.endsWith("d")) {
            date.setDate(date.getDate() + Number.parseInt(expiration));
        } else if (expiration.endsWith("h")) {
            date.setHours(date.getHours() + Number.parseInt(expiration));
        } else if (expiration.endsWith("m")) {
            date.setMinutes(date.getMinutes() + Number.parseInt(expiration));
        }

        return date;
    }

    private expirationToMs(expiration: string): number {
        const value = Number.parseInt(expiration);
        if (expiration.endsWith("d")) return value * 24 * 60 * 60 * 1000;
        if (expiration.endsWith("h")) return value * 60 * 60 * 1000;
        if (expiration.endsWith("m")) return value * 60 * 1000;
        return value * 1000;
    }

    private sanitizeUser(user: User) {
        return Object.fromEntries(
            Object.entries(user).filter(([key]) => key !== "password"),
        ) as Omit<User, "password">;
    }
}
