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

describe("JwtStrategy", () => {
    const validPayload = {
        sub: "user-id-123",
        email: "alice@demo.fr",
        role: "resident",
        exp: Math.floor(Date.now() / 1000) + 900,
    };

    describe("validate", () => {
        it("returns user object for valid payload", async () => {
            const strategy = new JwtStrategy(
                mockConfigService,
                makeDb("resident"),
            );
            const result = await strategy.validate(validPayload);
            expect(result).toEqual({
                sub: "user-id-123",
                email: "alice@demo.fr",
                role: "resident",
            });
        });

        it("throws ACCOUNT_BANNED for banned users", async () => {
            const strategy = new JwtStrategy(
                mockConfigService,
                makeDb("banned"),
            );
            await expect(strategy.validate(validPayload)).rejects.toThrow(
                UnauthorizedException,
            );
        });

        it("throws TOKEN_INVALID when user not found in DB", async () => {
            const strategy = new JwtStrategy(mockConfigService, makeDb(null));
            await expect(strategy.validate(validPayload)).rejects.toThrow(
                UnauthorizedException,
            );
        });

        it("throws UnauthorizedException when payload has no sub", async () => {
            const strategy = new JwtStrategy(
                mockConfigService,
                makeDb("resident"),
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
            );
            await expect(strategy.validate(null as any)).rejects.toThrow(
                UnauthorizedException,
            );
        });
    });
});
