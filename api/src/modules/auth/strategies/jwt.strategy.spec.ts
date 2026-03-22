import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "../auth.service";
import { JwtPayload, JwtStrategy } from "./jwt.strategy";

describe("JwtStrategy", () => {
    let strategy: JwtStrategy;

    const configService = {
        getOrThrow: jest.fn(),
    } as unknown as ConfigService;

    const authService = {
        validateUserById: jest.fn(),
    } as unknown as jest.Mocked<Pick<AuthService, "validateUserById">>;

    const payload: JwtPayload = {
        sub: "6fce8b71-2d1a-4d4a-9c12-44d4624e8f81",
        email: "john.doe@example.com",
        role: "client",
    };

    beforeEach(() => {
        jest.clearAllMocks();

        (configService.getOrThrow as jest.Mock).mockReturnValue(
            "access-secret",
        );
        strategy = new JwtStrategy(
            configService,
            authService as unknown as AuthService,
        );
    });

    it("validate returns user when user exists", async () => {
        const user = {
            id: payload.sub,
            email: payload.email,
            role: payload.role,
        };

        authService.validateUserById.mockResolvedValue(user as never);

        await expect(strategy.validate(payload)).resolves.toEqual(user);
        expect(authService.validateUserById).toHaveBeenCalledWith(payload.sub);
    });

    it("validate throws UnauthorizedException when user is not found", async () => {
        authService.validateUserById.mockResolvedValue(null as never);

        await expect(strategy.validate(payload)).rejects.toBeInstanceOf(
            UnauthorizedException,
        );
    });
});
