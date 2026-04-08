import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtStrategy } from "./jwt.strategy";

const mockConfigService = {
    get: jest.fn().mockReturnValue("test-secret"),
} as unknown as ConfigService;

function makeDb(role: string | null): any {
    const rows = role !== null ? [{ role }] : [];
    return {
        select: jest.fn().mockReturnValue({
            from: jest.fn().mockReturnValue({
                where: jest.fn().mockReturnValue({
                    limit: jest.fn().mockResolvedValue(rows),
                }),
            }),
        }),
    };
}

function makeTokenService(revoked = false): any {
    return { isAccessTokenRevoked: jest.fn().mockResolvedValue(revoked) };
}

describe("JwtStrategy", () => {
    const validPayload = {
        sub: "user-id-123",
        email: "alice@demo.fr",
        role: "resident",
        jti: "test-jti",
        exp: Math.floor(Date.now() / 1000) + 900,
    };

    describe("validate", () => {
        it("returns user object with jti/exp for valid payload", async () => {
            const strategy = new JwtStrategy(
                mockConfigService,
                makeDb("resident"),
                makeTokenService(false),
            );
            const result = await strategy.validate(validPayload);
            expect(result).toEqual({
                sub: "user-id-123",
                email: "alice@demo.fr",
                role: "resident",
                jti: "test-jti",
                exp: validPayload.exp,
            });
        });

        it("throws TOKEN_REVOKED for a revoked JTI", async () => {
            const strategy = new JwtStrategy(
                mockConfigService,
                makeDb("resident"),
                makeTokenService(true),
            );
            await expect(strategy.validate(validPayload)).rejects.toThrow(
                UnauthorizedException,
            );
        });

        it("throws ACCOUNT_BANNED for banned users", async () => {
            const strategy = new JwtStrategy(
                mockConfigService,
                makeDb("banned"),
                makeTokenService(false),
            );
            await expect(strategy.validate(validPayload)).rejects.toThrow(
                UnauthorizedException,
            );
        });

        it("throws TOKEN_INVALID when user not found in DB", async () => {
            const strategy = new JwtStrategy(
                mockConfigService,
                makeDb(null),
                makeTokenService(false),
            );
            await expect(strategy.validate(validPayload)).rejects.toThrow(
                UnauthorizedException,
            );
        });

        it("throws UnauthorizedException when payload has no sub", async () => {
            const strategy = new JwtStrategy(
                mockConfigService,
                makeDb("resident"),
                makeTokenService(false),
            );
            await expect(
                strategy.validate({
                    email: "x@y.fr",
                    role: "resident",
                    exp: 9999,
                } as any),
            ).rejects.toThrow(UnauthorizedException);
        });

        it("throws UnauthorizedException for null payload", async () => {
            const strategy = new JwtStrategy(
                mockConfigService,
                makeDb("resident"),
                makeTokenService(false),
            );
            await expect(strategy.validate(null as any)).rejects.toThrow(
                UnauthorizedException,
            );
        });

        it("skips revocation check when jti is absent", async () => {
            const tokenService = makeTokenService(false);
            const strategy = new JwtStrategy(
                mockConfigService,
                makeDb("resident"),
                tokenService,
            );
            const payloadWithoutJti = { ...validPayload, jti: undefined };
            await strategy.validate(payloadWithoutJti);
            expect(tokenService.isAccessTokenRevoked).not.toHaveBeenCalled();
        });
    });
});
