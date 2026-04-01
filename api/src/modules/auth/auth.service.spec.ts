import { MailerService } from "@nestjs-modules/mailer";
import {
    ConflictException,
    ForbiddenException,
    UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import bcrypt from "bcryptjs";
import type { RefreshToken, User } from "src/database/drizzle/schema";
import type { IAuthRepository } from "src/modules/auth/auth.repository";
import { AuthService } from "src/modules/auth/auth.service";
import { TotpService } from "src/modules/auth/totp.service";
import type { OutboxService } from "src/modules/outbox/outbox.service";

describe("AuthService", () => {
    let service: AuthService;
    let authRepository: jest.Mocked<IAuthRepository>;

    const outbox = {
        publish: jest.fn().mockResolvedValue(undefined),
    } as unknown as OutboxService;

    const jwtService = {
        sign: jest.fn(),
        verify: jest.fn(),
    } as unknown as JwtService;

    const configService = {
        get: jest.fn(),
        getOrThrow: jest.fn(),
    } as unknown as ConfigService;

    const sendMailMock = jest.fn().mockResolvedValue(undefined);

    const mailerService = {
        sendMail: sendMailMock,
    } as unknown as MailerService;

    const totpService = {
        isTotpEnabled: jest.fn().mockResolvedValue(false),
        validateCode: jest.fn(),
    } as unknown as TotpService;

    const baseUser: User = {
        id: "6fce8b71-2d1a-4d4a-9c12-44d4624e8f81",
        email: "john.doe@example.com",
        password: "hashed-password",
        firstName: "John",
        lastName: "Doe",
        role: "resident",
        isActive: true,
        balance: "0.00",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    };

    const baseRefreshToken: RefreshToken = {
        id: "token-id",
        userId: baseUser.id,
        token: "valid-refresh-token",
        revoked: false,
        expiresAt: new Date(Date.now() + 86_400_000),
        createdAt: new Date(),
    };

    beforeEach(() => {
        jest.clearAllMocks();

        authRepository = {
            findByEmail: jest.fn(),
            findById: jest.fn(),
            createUser: jest.fn(),
            findActiveRefreshToken: jest.fn(),
            createRefreshToken: jest.fn().mockResolvedValue(undefined),
            revokeRefreshToken: jest.fn().mockResolvedValue(undefined),
            revokeAllUserRefreshTokens: jest.fn().mockResolvedValue(undefined),
            deleteAllUserRefreshTokens: jest.fn().mockResolvedValue(undefined),
        };

        service = new AuthService(
            authRepository,
            outbox,
            jwtService,
            configService,
            mailerService,
            totpService,
        );

        (configService.get as jest.Mock).mockImplementation((key: string) => {
            if (key === "SALT_ROUNDS") return 10;
            return undefined;
        });

        (configService.getOrThrow as jest.Mock).mockImplementation(
            (key: string) => {
                const map: Record<string, string> = {
                    JWT_ACCESS_EXPIRATION: "15m",
                    JWT_REFRESH_EXPIRATION: "7d",
                    JWT_ACCESS_SECRET: "access-secret",
                    JWT_REFRESH_SECRET: "refresh-secret",
                    REFRESH_COOKIE_NAME: "refreshToken",
                    REFRESH_COOKIE_PATH: "/auth/refresh",
                };
                if (key in map) return map[key];
                throw new Error(`Unexpected config key: ${key}`);
            },
        );

        (jwtService.sign as jest.Mock).mockImplementation(
            (_payload: unknown, options?: { secret?: string }) =>
                options?.secret === "access-secret"
                    ? "access-token"
                    : "refresh-token",
        );
    });

    describe("register", () => {
        it("throws ConflictException when email already exists", async () => {
            authRepository.findByEmail.mockResolvedValue(baseUser);

            await expect(
                service.register({
                    email: baseUser.email,
                    password: "P@ssw0rd!",
                    firstName: "John",
                    lastName: "Doe",
                }),
            ).rejects.toBeInstanceOf(ConflictException);
        });

        it("creates a user and returns sanitized user with tokens", async () => {
            authRepository.findByEmail.mockResolvedValue(null);
            authRepository.createUser.mockResolvedValue(baseUser);
            jest.spyOn(bcrypt, "hash").mockResolvedValue("hashed" as never);

            const result = await service.register({
                email: "new@example.com",
                password: "P@ssw0rd!",
                firstName: "New",
                lastName: "User",
            });

            expect(result.user).toEqual(
                expect.objectContaining({ id: baseUser.id }),
            );
            expect(result.user).not.toHaveProperty("password");
            expect(result.accessToken).toBe("access-token");
            expect(result.refreshToken).toBe("refresh-token");
            expect(authRepository.createRefreshToken).toHaveBeenCalled();
        });
    });

    describe("login", () => {
        it("throws UnauthorizedException when user does not exist", async () => {
            authRepository.findByEmail.mockResolvedValue(null);

            await expect(
                service.login({
                    email: "missing@example.com",
                    password: "P@ssw0rd!",
                }),
            ).rejects.toBeInstanceOf(UnauthorizedException);
        });

        it("throws UnauthorizedException when password is invalid", async () => {
            authRepository.findByEmail.mockResolvedValue(baseUser);
            jest.spyOn(bcrypt, "compare").mockResolvedValue(false as never);

            await expect(
                service.login({ email: baseUser.email, password: "wrong" }),
            ).rejects.toBeInstanceOf(UnauthorizedException);
        });

        it("throws UnauthorizedException when account is deactivated", async () => {
            authRepository.findByEmail.mockResolvedValue({
                ...baseUser,
                isActive: false,
            });
            jest.spyOn(bcrypt, "compare").mockResolvedValue(true as never);

            await expect(
                service.login({ email: baseUser.email, password: "P@ssw0rd!" }),
            ).rejects.toBeInstanceOf(UnauthorizedException);
        });

        it("returns sanitized user with tokens on valid credentials", async () => {
            authRepository.findByEmail.mockResolvedValue(baseUser);
            jest.spyOn(bcrypt, "compare").mockResolvedValue(true as never);

            const result = await service.login({
                email: baseUser.email,
                password: "P@ssw0rd!",
            });

            expect("user" in result).toBe(true);
            if (!("user" in result)) return;
            expect(result.user.email).toBe(baseUser.email);
            expect(result.user).not.toHaveProperty("password");
            expect(result.accessToken).toBe("access-token");
        });

        it("returns TOTP challenge when TOTP is enabled", async () => {
            authRepository.findByEmail.mockResolvedValue(baseUser);
            jest.spyOn(bcrypt, "compare").mockResolvedValue(true as never);
            (totpService.isTotpEnabled as jest.Mock).mockResolvedValueOnce(
                true,
            );

            const result = await service.login({
                email: baseUser.email,
                password: "P@ssw0rd!",
            });

            expect("requiresTotp" in result).toBe(true);
            if (!("requiresTotp" in result)) return;
            expect(result.requiresTotp).toBe(true);
            expect(typeof result.totpToken).toBe("string");
        });
    });

    describe("completeTotpLogin", () => {
        it("throws UnauthorizedException on invalid token", async () => {
            (jwtService.verify as jest.Mock).mockImplementation(() => {
                throw new Error("invalid token");
            });

            await expect(
                service.completeTotpLogin({ totpToken: "bad", code: "123456" }),
            ).rejects.toBeInstanceOf(UnauthorizedException);
        });

        it("throws UnauthorizedException on wrong token type", async () => {
            (jwtService.verify as jest.Mock).mockReturnValue({
                sub: baseUser.id,
                type: "access",
            });

            await expect(
                service.completeTotpLogin({
                    totpToken: "bad-type",
                    code: "123456",
                }),
            ).rejects.toBeInstanceOf(UnauthorizedException);
        });

        it("throws UnauthorizedException on invalid TOTP code", async () => {
            (jwtService.verify as jest.Mock).mockReturnValue({
                sub: baseUser.id,
                type: "totp-pending",
            });
            (totpService.validateCode as jest.Mock).mockResolvedValue(false);

            await expect(
                service.completeTotpLogin({
                    totpToken: "valid",
                    code: "000000",
                }),
            ).rejects.toBeInstanceOf(UnauthorizedException);
        });

        it("throws UnauthorizedException for deactivated user", async () => {
            (jwtService.verify as jest.Mock).mockReturnValue({
                sub: baseUser.id,
                type: "totp-pending",
            });
            (totpService.validateCode as jest.Mock).mockResolvedValue(true);
            authRepository.findById.mockResolvedValue({
                ...baseUser,
                isActive: false,
            });

            await expect(
                service.completeTotpLogin({
                    totpToken: "valid",
                    code: "123456",
                }),
            ).rejects.toBeInstanceOf(UnauthorizedException);
        });

        it("returns tokens on valid TOTP code", async () => {
            (jwtService.verify as jest.Mock).mockReturnValue({
                sub: baseUser.id,
                type: "totp-pending",
            });
            (totpService.validateCode as jest.Mock).mockResolvedValue(true);
            authRepository.findById.mockResolvedValue(baseUser);

            const result = await service.completeTotpLogin({
                totpToken: "valid",
                code: "123456",
            });

            expect("user" in result).toBe(true);
            if (!("user" in result)) return;
            expect(result.user.email).toBe(baseUser.email);
            expect(result.accessToken).toBe("access-token");
        });
    });

    describe("refresh", () => {
        it("throws UnauthorizedException when token is not found", async () => {
            authRepository.findActiveRefreshToken.mockResolvedValue(null);

            await expect(
                service.refresh({ refreshToken: "invalid" }),
            ).rejects.toBeInstanceOf(UnauthorizedException);
        });

        it("throws UnauthorizedException when token user does not exist", async () => {
            authRepository.findActiveRefreshToken.mockResolvedValue(
                baseRefreshToken,
            );
            authRepository.findById.mockResolvedValue(null);

            await expect(
                service.refresh({ refreshToken: "valid-refresh-token" }),
            ).rejects.toBeInstanceOf(UnauthorizedException);
        });

        it("throws ForbiddenException and purges sessions when token is revoked", async () => {
            const revokedToken = { ...baseRefreshToken, revoked: true };
            authRepository.findActiveRefreshToken.mockResolvedValue(
                revokedToken,
            );
            authRepository.findById.mockResolvedValue(baseUser);

            await expect(
                service.refresh({ refreshToken: "revoked-refresh-token" }),
            ).rejects.toBeInstanceOf(ForbiddenException);

            expect(
                authRepository.deleteAllUserRefreshTokens,
            ).toHaveBeenCalledWith(baseUser.id);
            expect(sendMailMock).toHaveBeenCalledWith(
                expect.objectContaining({ to: baseUser.email }),
            );
        });

        it("rotates token and returns sanitized user with new tokens", async () => {
            authRepository.findActiveRefreshToken.mockResolvedValue(
                baseRefreshToken,
            );
            authRepository.findById.mockResolvedValue(baseUser);

            const result = await service.refresh({
                refreshToken: "old-refresh-token",
            });

            expect(authRepository.revokeRefreshToken).toHaveBeenCalledWith(
                baseRefreshToken.id,
            );
            expect(authRepository.createRefreshToken).toHaveBeenCalled();
            expect(result.user).toEqual(
                expect.objectContaining({ id: baseUser.id }),
            );
            expect(result.user).not.toHaveProperty("password");
            expect(result.accessToken).toBe("access-token");
        });
    });

    describe("logout", () => {
        it("revokes all refresh tokens for the user", async () => {
            const result = await service.logout({ userId: baseUser.id });

            expect(
                authRepository.revokeAllUserRefreshTokens,
            ).toHaveBeenCalledWith(baseUser.id);
            expect(result).toEqual({ message: "Logged out successfully" });
        });
    });

    describe("validateUserById", () => {
        it("returns null for inactive users", async () => {
            authRepository.findById.mockResolvedValue({
                ...baseUser,
                isActive: false,
            });

            const result = await service.validateUserById(baseUser.id);

            expect(result).toBeNull();
        });

        it("returns sanitized active user", async () => {
            authRepository.findById.mockResolvedValue(baseUser);

            const result = await service.validateUserById(baseUser.id);

            expect(result).toEqual(
                expect.objectContaining({ id: baseUser.id }),
            );
            expect(result).not.toHaveProperty("password");
        });
    });
});
