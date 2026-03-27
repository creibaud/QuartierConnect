import { MailerService } from "@nestjs-modules/mailer";
import {
    ConflictException,
    ForbiddenException,
    UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import bcrypt from "bcryptjs";
import type { DrizzleDB } from "src/database/drizzle/drizzle.type";
import { refreshTokens, users, type User } from "src/database/drizzle/schema";
import { AuthService } from "src/modules/auth/auth.service";
import { TotpService } from "src/modules/auth/totp.service";
import type { OutboxService } from "src/modules/outbox/outbox.service";

describe("AuthService", () => {
    let service: AuthService;

    const db = {
        select: jest.fn(),
        insert: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
    } as unknown as DrizzleDB;

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

    const createSelectChain = <T>(result: T[]) => ({
        from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue(result),
            }),
        }),
    });

    beforeEach(() => {
        jest.clearAllMocks();

        service = new AuthService(
            db,
            outbox,
            jwtService,
            configService,
            mailerService,
            totpService,
        );

        (configService.get as jest.Mock).mockImplementation((key: string) => {
            if (key === "SALT_ROUNDS") {
                return 10;
            }
            return undefined;
        });

        (configService.getOrThrow as jest.Mock).mockImplementation(
            (key: string) => {
                if (key === "JWT_ACCESS_EXPIRATION") {
                    return "15m";
                }
                if (key === "JWT_REFRESH_EXPIRATION") {
                    return "7d";
                }
                if (key === "JWT_ACCESS_SECRET") {
                    return "access-secret";
                }
                if (key === "JWT_REFRESH_SECRET") {
                    return "refresh-secret";
                }
                throw new Error(`Unexpected key: ${key}`);
            },
        );

        (jwtService.sign as jest.Mock).mockImplementation(
            (_payload: unknown, options?: { secret?: string }) => {
                return options?.secret === "access-secret"
                    ? "access-token"
                    : "refresh-token";
            },
        );
    });

    it("register throws ConflictException if email already exists", async () => {
        (db.select as jest.Mock).mockReturnValueOnce(
            createSelectChain([baseUser]),
        );

        await expect(
            service.register({
                email: baseUser.email,
                password: "P@ssw0rd!",
                firstName: "John",
                lastName: "Doe",
            }),
        ).rejects.toBeInstanceOf(ConflictException);
    });

    it("register creates a user and returns sanitized user with tokens", async () => {
        const createdUser: User = {
            ...baseUser,
            id: "4d8062b6-83ca-4752-a7a8-cb822f8a95f1",
        };

        (db.select as jest.Mock).mockReturnValueOnce(createSelectChain([]));
        jest.spyOn(bcrypt, "hash").mockResolvedValue(
            "hashed-password" as never,
        );

        (db.insert as jest.Mock)
            .mockImplementationOnce((table: unknown) => {
                expect(table).toBe(users);
                return {
                    values: jest.fn().mockReturnValue({
                        returning: jest
                            .fn()
                            .mockResolvedValueOnce([createdUser]),
                    }),
                };
            })
            .mockImplementationOnce((table: unknown) => {
                expect(table).toBe(refreshTokens);
                return {
                    values: jest.fn().mockResolvedValueOnce(undefined),
                };
            });

        const result = await service.register({
            email: "new.user@example.com",
            password: "P@ssw0rd!",
            firstName: "New",
            lastName: "User",
        });

        expect(result.user).toEqual(
            expect.objectContaining({
                id: createdUser.id,
                email: createdUser.email,
            }),
        );
        expect(result.user).not.toHaveProperty("password");
        expect(result.accessToken).toBe("access-token");
        expect(result.refreshToken).toBe("refresh-token");
    });

    it("login throws UnauthorizedException when user does not exist", async () => {
        (db.select as jest.Mock).mockReturnValueOnce(createSelectChain([]));

        await expect(
            service.login({
                email: "missing@example.com",
                password: "P@ssw0rd!",
            }),
        ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("login throws UnauthorizedException when password is invalid", async () => {
        (db.select as jest.Mock).mockReturnValueOnce(
            createSelectChain([baseUser]),
        );
        jest.spyOn(bcrypt, "compare").mockResolvedValue(false as never);

        await expect(
            service.login({
                email: baseUser.email,
                password: "wrong-password",
            }),
        ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("login throws UnauthorizedException when account is deactivated", async () => {
        (db.select as jest.Mock).mockReturnValueOnce(
            createSelectChain([{ ...baseUser, isActive: false }]),
        );
        jest.spyOn(bcrypt, "compare").mockResolvedValue(true as never);

        await expect(
            service.login({
                email: baseUser.email,
                password: "P@ssw0rd!",
            }),
        ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("login returns sanitized user with tokens", async () => {
        (db.select as jest.Mock).mockReturnValueOnce(
            createSelectChain([baseUser]),
        );
        jest.spyOn(bcrypt, "compare").mockResolvedValue(true as never);

        (db.insert as jest.Mock).mockImplementationOnce((table: unknown) => {
            expect(table).toBe(refreshTokens);
            return {
                values: jest.fn().mockResolvedValueOnce(undefined),
            };
        });

        const result = await service.login({
            email: baseUser.email,
            password: "P@ssw0rd!",
        });

        expect("user" in result).toBe(true);
        if (!("user" in result)) return;

        expect(result.user.email).toBe(baseUser.email);
        expect(result.user).not.toHaveProperty("password");
        expect(result.accessToken).toBe("access-token");
        expect(result.refreshToken).toBe("refresh-token");
    });

    it("refresh throws UnauthorizedException when token is invalid", async () => {
        (db.select as jest.Mock).mockReturnValueOnce(createSelectChain([]));

        await expect(
            service.refresh({ refreshToken: "invalid" }),
        ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("refresh throws UnauthorizedException when token user does not exist", async () => {
        (db.select as jest.Mock)
            .mockReturnValueOnce(
                createSelectChain([
                    {
                        id: "token-id",
                        userId: "missing-user-id",
                        token: "valid-refresh-token",
                        revoked: false,
                        expiresAt: new Date(Date.now() + 86_400_000),
                        createdAt: new Date(),
                    },
                ]),
            )
            .mockReturnValueOnce(createSelectChain([]));

        await expect(
            service.refresh({ refreshToken: "valid-refresh-token" }),
        ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("refresh throws ForbiddenException and purges user sessions when token is revoked", async () => {
        const storedRevokedToken = {
            id: "revoked-token-id",
            userId: baseUser.id,
            token: "revoked-refresh-token",
            revoked: true,
            expiresAt: new Date(Date.now() + 86_400_000),
            createdAt: new Date(),
        };

        (db.select as jest.Mock).mockReturnValueOnce(
            createSelectChain([storedRevokedToken]),
        );
        (db.select as jest.Mock).mockReturnValueOnce(
            createSelectChain([baseUser]),
        );

        const deleteWhere = jest.fn().mockResolvedValue(undefined);
        (db.delete as jest.Mock).mockReturnValue({ where: deleteWhere });

        await expect(
            service.refresh({ refreshToken: "revoked-refresh-token" }),
        ).rejects.toBeInstanceOf(ForbiddenException);

        expect(deleteWhere).toHaveBeenCalledTimes(1);
        expect(sendMailMock).toHaveBeenCalledTimes(1);
        expect(sendMailMock).toHaveBeenCalledWith(
            expect.objectContaining({ to: baseUser.email }),
        );
    });

    it("refresh rotates token and returns sanitized user with new tokens", async () => {
        const storedToken = {
            id: "refresh-token-id",
            userId: baseUser.id,
            token: "old-refresh-token",
            revoked: false,
            expiresAt: new Date(Date.now() + 86_400_000),
            createdAt: new Date(),
        };

        (db.select as jest.Mock)
            .mockReturnValueOnce(createSelectChain([storedToken]))
            .mockReturnValueOnce(createSelectChain([baseUser]));

        const updateWhere = jest.fn().mockResolvedValue(undefined);
        const updateSet = jest.fn().mockReturnValue({ where: updateWhere });
        (db.update as jest.Mock).mockReturnValue({ set: updateSet });

        (db.insert as jest.Mock).mockImplementationOnce((table: unknown) => {
            expect(table).toBe(refreshTokens);
            return {
                values: jest.fn().mockResolvedValueOnce(undefined),
            };
        });

        const result = await service.refresh({
            refreshToken: "old-refresh-token",
        });

        expect(updateSet).toHaveBeenCalledWith({ revoked: true });
        expect(updateWhere).toHaveBeenCalledTimes(1);
        expect(result.user).toEqual(
            expect.objectContaining({
                id: baseUser.id,
                email: baseUser.email,
            }),
        );
        expect(result.user).not.toHaveProperty("password");
        expect(result.accessToken).toBe("access-token");
        expect(result.refreshToken).toBe("refresh-token");
    });

    it("logout revokes all refresh tokens for the user", async () => {
        const updateWhere = jest.fn().mockResolvedValue(undefined);
        const updateSet = jest.fn().mockReturnValue({ where: updateWhere });
        (db.update as jest.Mock).mockReturnValue({ set: updateSet });

        const result = await service.logout({ userId: baseUser.id });

        expect(updateSet).toHaveBeenCalledWith({ revoked: true });
        expect(updateWhere).toHaveBeenCalledTimes(1);
        expect(result).toEqual({ message: "Logged out successfully" });
    });

    it("validateUserById returns null for inactive users", async () => {
        (db.select as jest.Mock).mockReturnValueOnce(
            createSelectChain([{ ...baseUser, isActive: false }]),
        );

        const result = await service.validateUserById(baseUser.id);

        expect(result).toBeNull();
    });

    it("validateUserById returns sanitized active user", async () => {
        (db.select as jest.Mock).mockReturnValueOnce(
            createSelectChain([baseUser]),
        );

        const result = await service.validateUserById(baseUser.id);

        expect(result).toEqual(
            expect.objectContaining({
                id: baseUser.id,
                email: baseUser.email,
            }),
        );
        expect(result).not.toHaveProperty("password");
    });

    it("login returns totpToken when TOTP is enabled", async () => {
        (totpService.isTotpEnabled as jest.Mock).mockResolvedValueOnce(true);
        (db.select as jest.Mock).mockReturnValueOnce(
            createSelectChain([baseUser]),
        );
        jest.spyOn(bcrypt, "compare").mockResolvedValue(true as never);

        const result = await service.login({
            email: baseUser.email,
            password: "P@ssw0rd!",
        });

        expect("requiresTotp" in result).toBe(true);
        if (!("requiresTotp" in result)) return;
        expect(result.requiresTotp).toBe(true);
        expect(typeof result.totpToken).toBe("string");
    });

    it("completeTotpLogin throws UnauthorizedException on invalid token", async () => {
        (jwtService.verify as jest.Mock).mockImplementation(() => {
            throw new Error("invalid token");
        });

        await expect(
            service.completeTotpLogin({ totpToken: "bad", code: "123456" }),
        ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("completeTotpLogin throws UnauthorizedException on wrong token type", async () => {
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

    it("completeTotpLogin throws UnauthorizedException on invalid TOTP code", async () => {
        (jwtService.verify as jest.Mock).mockReturnValue({
            sub: baseUser.id,
            type: "totp-pending",
        });
        (totpService.validateCode as jest.Mock).mockResolvedValue(false);

        await expect(
            service.completeTotpLogin({ totpToken: "valid", code: "000000" }),
        ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("completeTotpLogin throws UnauthorizedException for deactivated user", async () => {
        (jwtService.verify as jest.Mock).mockReturnValue({
            sub: baseUser.id,
            type: "totp-pending",
        });
        (totpService.validateCode as jest.Mock).mockResolvedValue(true);
        (db.select as jest.Mock).mockReturnValueOnce(
            createSelectChain([{ ...baseUser, isActive: false }]),
        );

        await expect(
            service.completeTotpLogin({ totpToken: "valid", code: "123456" }),
        ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("completeTotpLogin returns tokens on valid TOTP code", async () => {
        (jwtService.verify as jest.Mock).mockReturnValue({
            sub: baseUser.id,
            type: "totp-pending",
        });
        (totpService.validateCode as jest.Mock).mockResolvedValue(true);
        (db.select as jest.Mock).mockReturnValueOnce(
            createSelectChain([baseUser]),
        );
        (db.insert as jest.Mock).mockImplementationOnce((table: unknown) => {
            expect(table).toBe(refreshTokens);
            return { values: jest.fn().mockResolvedValueOnce(undefined) };
        });

        const result = await service.completeTotpLogin({
            totpToken: "valid",
            code: "123456",
        });

        expect("user" in result).toBe(true);
        if (!("user" in result)) return;
        expect(result.user.email).toBe(baseUser.email);
        expect(result.accessToken).toBe("access-token");
        expect(result.refreshToken).toBe("refresh-token");
    });
});
