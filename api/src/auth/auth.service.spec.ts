import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import * as argon2 from "argon2";
import { DRIZZLE_TOKEN } from "../database/drizzle.module";
import { SocialService } from "../social/social.service";
import { AuthService } from "./auth.service";
import { SsoSurface, SsoToken } from "./schemas/sso-token.schema";
import { TokenService } from "./token.service";
import { TotpService } from "./totp.service";

jest.mock("argon2", () => ({
    hash: jest.fn().mockResolvedValue("$argon2id$hashed"),
    verify: jest.fn().mockResolvedValue(true),
}));

const mockUser = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    email: "alice@demo.fr",
    passwordHash: "$argon2id$hashed",
    totpSecret: "BASE32SECRET",
    role: "resident",
    refreshTokenHash: null,
};

const mockTokenPair = {
    accessToken: "access.token",
    refreshToken: "refresh.token",
};

describe("AuthService", () => {
    let service: AuthService;
    let mockDb: any;
    let ssoTokenModel: any;
    let totpService: TotpService;

    beforeEach(async () => {
        mockDb = {
            select: jest.fn().mockReturnThis(),
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockResolvedValue([mockUser]),
            insert: jest.fn().mockReturnThis(),
            values: jest.fn().mockReturnValue({
                returning: jest.fn().mockResolvedValue([{ id: mockUser.id }]),
            }),
        };

        ssoTokenModel = {
            create: jest.fn(),
            findOneAndUpdate: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: DRIZZLE_TOKEN, useValue: mockDb },
                {
                    provide: getModelToken(SsoToken.name),
                    useValue: ssoTokenModel,
                },
                {
                    provide: TotpService,
                    useValue: {
                        generateSecret: jest.fn().mockReturnValue({
                            secret: "BASE32",
                            otpauthUrl: "otpauth://totp/...",
                        }),
                        verify: jest.fn().mockReturnValue(true),
                    },
                },
                {
                    provide: TokenService,
                    useValue: {
                        generatePair: jest
                            .fn()
                            .mockResolvedValue(mockTokenPair),
                    },
                },
                {
                    provide: SocialService,
                    useValue: {
                        syncUser: jest.fn().mockResolvedValue(undefined),
                    },
                },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
        totpService = module.get<TotpService>(TotpService);
        jest.clearAllMocks();
        (argon2.verify as jest.Mock).mockResolvedValue(true);
        (argon2.hash as jest.Mock).mockResolvedValue("$argon2id$hashed");

        mockDb.select.mockReturnValue(mockDb);
        mockDb.from.mockReturnValue(mockDb);
        mockDb.insert.mockReturnValue(mockDb);
        mockDb.values.mockReturnValue({
            returning: jest.fn().mockResolvedValue([{ id: mockUser.id }]),
        });
        mockDb.where.mockResolvedValue([mockUser]);
    });

    describe("register", () => {
        it("creates user + returns otpauthUrl (never totpSecret)", async () => {
            mockDb.where.mockResolvedValue(undefined);
            mockDb.values.mockReturnValue({
                returning: jest.fn().mockResolvedValue([{ id: mockUser.id }]),
            });

            const result = await service.register({
                email: "alice@demo.fr",
                password: "Demo1234!",
            });
            expect(result).toHaveProperty("otpauthUrl");
            expect(JSON.stringify(result)).not.toContain("totpSecret");
        });

        it("throws ConflictException on duplicate email (pg code 23505)", async () => {
            mockDb.values.mockReturnValue({
                returning: jest.fn().mockRejectedValue({ code: "23505" }),
            });
            await expect(
                service.register({
                    email: "alice@demo.fr",
                    password: "Demo1234!",
                }),
            ).rejects.toThrow(ConflictException);
        });
    });

    describe("login", () => {
        it("returns JWT pair for valid credentials + TOTP", async () => {
            mockDb.where.mockResolvedValue([mockUser]);
            (argon2.verify as jest.Mock).mockResolvedValue(true);
            jest.spyOn(totpService, "verify").mockReturnValue(true);

            const result = await service.login({
                email: "alice@demo.fr",
                password: "Demo1234!",
                totpCode: "123456",
            });
            expect(result).toHaveProperty("accessToken");
            expect(result).toHaveProperty("refreshToken");
        });

        it("throws UnauthorizedException for unknown email", async () => {
            mockDb.where.mockResolvedValue([]);
            await expect(
                service.login({
                    email: "unknown@demo.fr",
                    password: "Demo1234!",
                    totpCode: "123456",
                }),
            ).rejects.toThrow(UnauthorizedException);
        });

        it("throws UnauthorizedException for wrong password", async () => {
            mockDb.where.mockResolvedValue([mockUser]);
            (argon2.verify as jest.Mock).mockResolvedValue(false);
            await expect(
                service.login({
                    email: "alice@demo.fr",
                    password: "wrong",
                    totpCode: "123456",
                }),
            ).rejects.toThrow(UnauthorizedException);
        });

        it("throws UnauthorizedException for banned account", async () => {
            mockDb.where.mockResolvedValue([{ ...mockUser, role: "banned" }]);
            await expect(
                service.login({
                    email: "alice@demo.fr",
                    password: "Demo1234!",
                    totpCode: "123456",
                }),
            ).rejects.toThrow(UnauthorizedException);
        });

        it("throws UnauthorizedException for wrong TOTP", async () => {
            mockDb.where.mockResolvedValue([mockUser]);
            (argon2.verify as jest.Mock).mockResolvedValue(true);
            jest.spyOn(totpService, "verify").mockReturnValue(false);
            await expect(
                service.login({
                    email: "alice@demo.fr",
                    password: "Demo1234!",
                    totpCode: "000000",
                }),
            ).rejects.toThrow(UnauthorizedException);
        });
    });

    describe("sso/generate", () => {
        it("returns ssoToken + expiresAt ISO + expiresIn 300", async () => {
            ssoTokenModel.create.mockResolvedValue({});
            const result = await service.generateSsoToken(
                "550e8400-e29b-41d4-a716-446655440000",
                SsoSurface.JAVA_DESKTOP,
            );
            expect(result.ssoToken).toBeTruthy();
            expect(result.expiresIn).toBe(300);
            expect(new Date(result.expiresAt).getTime()).toBeGreaterThan(
                Date.now(),
            );
        });

        it("stores state in document when provided", async () => {
            ssoTokenModel.create.mockResolvedValue({});
            const state = "550e8400-e29b-41d4-a716-446655440001";
            await service.generateSsoToken(
                "550e8400-e29b-41d4-a716-446655440000",
                SsoSurface.JAVA_DESKTOP,
                state,
            );
            expect(ssoTokenModel.create).toHaveBeenCalledWith(
                expect.objectContaining({ state }),
            );
        });

        it("stores null state when not provided", async () => {
            ssoTokenModel.create.mockResolvedValue({});
            await service.generateSsoToken(
                "550e8400-e29b-41d4-a716-446655440000",
                SsoSurface.JAVA_DESKTOP,
            );
            expect(ssoTokenModel.create).toHaveBeenCalledWith(
                expect.objectContaining({ state: null }),
            );
        });
    });

    describe("sso/exchange", () => {
        it("returns JWT pair for valid unused non-expired token", async () => {
            ssoTokenModel.findOneAndUpdate.mockResolvedValue({
                userId: "550e8400-e29b-41d4-a716-446655440000",
                state: null,
            });
            mockDb.where.mockResolvedValue([mockUser]);
            const result = await service.exchangeSsoToken("valid-uuid");
            expect(result).toHaveProperty("accessToken");
            expect(result).toHaveProperty("refreshToken");
        });

        it("throws UnauthorizedException for already used token", async () => {
            ssoTokenModel.findOneAndUpdate.mockResolvedValue(null);
            await expect(service.exchangeSsoToken("used-uuid")).rejects.toThrow(
                UnauthorizedException,
            );
        });

        it("throws UnauthorizedException on state mismatch", async () => {
            ssoTokenModel.findOneAndUpdate.mockResolvedValue({
                userId: "550e8400-e29b-41d4-a716-446655440000",
                state: "expected-state",
            });
            await expect(
                service.exchangeSsoToken("valid-uuid", "wrong-state"),
            ).rejects.toThrow(UnauthorizedException);
        });

        it("throws UnauthorizedException when user not found after valid token", async () => {
            ssoTokenModel.findOneAndUpdate.mockResolvedValue({
                userId: "550e8400-e29b-41d4-a716-446655440099",
                state: null,
            });
            mockDb.where.mockResolvedValue([]);
            await expect(
                service.exchangeSsoToken("valid-uuid"),
            ).rejects.toThrow(UnauthorizedException);
        });
    });
});
