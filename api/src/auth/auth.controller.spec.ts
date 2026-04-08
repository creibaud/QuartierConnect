import { Test, TestingModule } from "@nestjs/testing";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { SsoSurface } from "./schemas/sso-token.schema";

const mockTokenPair = {
    accessToken: "access.token",
    refreshToken: "refresh.token",
};

const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    generateSsoToken: jest.fn(),
    exchangeSsoToken: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
};

describe("AuthController", () => {
    let controller: AuthController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthController],
            providers: [{ provide: AuthService, useValue: mockAuthService }],
        }).compile();

        controller = module.get<AuthController>(AuthController);
        jest.clearAllMocks();
    });

    describe("register", () => {
        it("delegates to authService.register and returns result", async () => {
            const dto = { email: "alice@demo.fr", password: "Demo1234!" };
            const expected = { otpauthUrl: "otpauth://totp/..." };
            mockAuthService.register.mockResolvedValue(expected);

            const result = await controller.register(dto);

            expect(mockAuthService.register).toHaveBeenCalledWith(dto);
            expect(result).toBe(expected);
        });
    });

    describe("login", () => {
        it("delegates to authService.login and returns token pair", async () => {
            const dto = {
                email: "alice@demo.fr",
                password: "Demo1234!",
                totpCode: "123456",
            };
            mockAuthService.login.mockResolvedValue(mockTokenPair);

            const result = await controller.login(dto);

            expect(mockAuthService.login).toHaveBeenCalledWith(dto);
            expect(result).toBe(mockTokenPair);
        });
    });

    describe("sso/generate", () => {
        it("delegates to authService.generateSsoToken with sub from request", async () => {
            const req = {
                user: {
                    sub: "user-id-123",
                    email: "test@test.fr",
                    role: "resident",
                },
            };
            const dto = { surface: SsoSurface.JAVA_DESKTOP };
            const expected = {
                ssoToken: "uuid",
                expiresAt: new Date().toISOString(),
                expiresIn: 300,
            };
            mockAuthService.generateSsoToken.mockResolvedValue(expected);

            const result = await controller.generateSsoToken(req, dto);

            expect(mockAuthService.generateSsoToken).toHaveBeenCalledWith(
                "user-id-123",
                SsoSurface.JAVA_DESKTOP,
                undefined,
            );
            expect(result).toBe(expected);
        });
    });

    describe("sso/exchange", () => {
        it("delegates to authService.exchangeSsoToken", async () => {
            const dto = { ssoToken: "valid-uuid", state: "abc" };
            mockAuthService.exchangeSsoToken.mockResolvedValue(mockTokenPair);

            const result = await controller.exchangeSsoToken(dto);

            expect(mockAuthService.exchangeSsoToken).toHaveBeenCalledWith(
                "valid-uuid",
                "abc",
            );
            expect(result).toBe(mockTokenPair);
        });
    });

    describe("refresh", () => {
        it("delegates to authService.refresh", async () => {
            const dto = { refreshToken: "refresh.token" };
            mockAuthService.refresh.mockResolvedValue(mockTokenPair);

            const result = await controller.refresh(dto);

            expect(mockAuthService.refresh).toHaveBeenCalledWith(
                "refresh.token",
            );
            expect(result).toBe(mockTokenPair);
        });
    });

    describe("logout", () => {
        it("delegates to authService.logout with sub from request", async () => {
            const req = {
                user: {
                    sub: "user-id-123",
                    email: "test@test.fr",
                    role: "resident",
                },
            };
            mockAuthService.logout.mockResolvedValue({ success: true });

            const result = await controller.logout(req);

            expect(mockAuthService.logout).toHaveBeenCalledWith("user-id-123");
            expect(result).toEqual({ success: true });
        });
    });
});
