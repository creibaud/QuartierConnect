import { UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import * as argon2 from "argon2";
import { DRIZZLE_TOKEN } from "../database/drizzle.module";
import { TokenService } from "./token.service";

const mockUser = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    email: "alice@demo.fr",
    role: "resident",
    refreshTokenHash: null,
};

describe("TokenService", () => {
    let service: TokenService;
    let mockDb: any;
    let jwtService: JwtService;

    beforeEach(async () => {
        mockDb = {
            select: jest.fn().mockReturnThis(),
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockResolvedValue([mockUser]),
            update: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TokenService,
                { provide: DRIZZLE_TOKEN, useValue: mockDb },
                {
                    provide: JwtService,
                    useValue: {
                        signAsync: jest.fn().mockResolvedValue("signed.token"),
                        verify: jest.fn().mockReturnValue({
                            sub: mockUser.id,
                            email: mockUser.email,
                            role: mockUser.role,
                        }),
                    },
                },
            ],
        }).compile();

        service = module.get<TokenService>(TokenService);
        jwtService = module.get<JwtService>(JwtService);

        mockDb.select.mockReturnValue(mockDb);
        mockDb.from.mockReturnValue(mockDb);
        mockDb.update.mockReturnValue(mockDb);
        mockDb.set.mockReturnValue(mockDb);
        mockDb.where.mockResolvedValue([mockUser]);
    });

    it("generates JWT pair and stores refreshTokenHash", async () => {
        mockDb.where.mockResolvedValue(undefined);
        const result = await service.generatePair({
            sub: mockUser.id,
            email: mockUser.email,
            role: mockUser.role,
        });
        expect(result.accessToken).toBeTruthy();
        expect(result.refreshToken).toBeTruthy();
        expect(mockDb.update).toHaveBeenCalled();
        expect(mockDb.set).toHaveBeenCalledWith(
            expect.objectContaining({ refreshTokenHash: expect.any(String) }),
        );
    });

    it("rotates valid refresh token", async () => {
        const realRefresh = "refresh.token";
        const hash = await argon2.hash(realRefresh);
        mockDb.where.mockResolvedValue([
            { ...mockUser, refreshTokenHash: hash },
        ]);
        mockDb.update.mockReturnValue(mockDb);
        mockDb.set.mockReturnValue(mockDb);

        jest.spyOn(jwtService, "verify").mockReturnValue({
            sub: mockUser.id,
            email: mockUser.email,
            role: mockUser.role,
        } as any);
        const result = await service.rotateRefreshToken(realRefresh);
        expect(result).toHaveProperty("accessToken");
    });

    it("throws UnauthorizedException for malformed JWT", async () => {
        jest.spyOn(jwtService, "verify").mockImplementation(() => {
            throw new Error("invalid signature");
        });
        await expect(
            service.rotateRefreshToken("bad.jwt.token"),
        ).rejects.toThrow(UnauthorizedException);
    });

    it("throws TOKEN_INVALID when refresh token is expired (TokenExpiredError)", async () => {
        const tokenExpiredError = Object.assign(new Error("jwt expired"), {
            name: "TokenExpiredError",
            expiredAt: new Date(Date.now() - 1000),
        });
        jest.spyOn(jwtService, "verify").mockImplementation(() => {
            throw tokenExpiredError;
        });
        const error = await service
            .rotateRefreshToken("expired.jwt.token")
            .catch((e: unknown) => e);
        expect(error).toBeInstanceOf(UnauthorizedException);
        expect((error as UnauthorizedException).getResponse()).toMatchObject({
            code: "TOKEN_INVALID",
        });
    });

    it("throws UnauthorizedException for banned account during refresh", async () => {
        const hash = await argon2.hash("refresh.token");
        mockDb.where.mockResolvedValue([
            { ...mockUser, role: "banned", refreshTokenHash: hash },
        ]);
        mockDb.update.mockReturnValue(mockDb);
        mockDb.set.mockReturnValue(mockDb);
        jest.spyOn(jwtService, "verify").mockReturnValue({
            sub: mockUser.id,
            email: mockUser.email,
            role: "banned",
        } as any);
        await expect(
            service.rotateRefreshToken("refresh.token"),
        ).rejects.toThrow(UnauthorizedException);
    });

    it("throws UnauthorizedException for revoked token (null hash)", async () => {
        mockDb.where.mockResolvedValue([
            { ...mockUser, refreshTokenHash: null },
        ]);
        await expect(service.rotateRefreshToken("any.token")).rejects.toThrow(
            UnauthorizedException,
        );
    });

    it("throws UnauthorizedException for hash mismatch (cross-user attack)", async () => {
        const differentUserHash = await argon2.hash("different.refresh.token");
        mockDb.where.mockResolvedValue([
            { ...mockUser, refreshTokenHash: differentUserHash },
        ]);
        await expect(
            service.rotateRefreshToken("attacker.token"),
        ).rejects.toThrow(UnauthorizedException);
    });

    it("clears refreshTokenHash on revoke", async () => {
        mockDb.where.mockResolvedValue(undefined);
        await service.revokeRefreshToken(mockUser.id);
        expect(mockDb.set).toHaveBeenCalledWith({ refreshTokenHash: null });
    });
});
