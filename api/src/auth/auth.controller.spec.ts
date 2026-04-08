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

const mockRes = () => ({
    cookie: jest.fn(),
    clearCookie: jest.fn(),
});

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
        it("sets refresh cookie and returns token pair", async () => {
            const dto = {
                email: "alice@demo.fr",
                password: "Demo1234!",
                totpCode: "123456",
            };
            const res = mockRes();
            mockAuthService.login.mockResolvedValue(mockTokenPair);

            const result = await controller.login(dto, res as any);

            expect(mockAuthService.login).toHaveBeenCalledWith(dto);
            expect(res.cookie).toHaveBeenCalledWith(
                "qc_rt",
                "refresh.token",
                expect.objectContaining({ httpOnly: true }),
            );
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

            const result = await controller.generateSsoToken(req as any, dto);

            expect(mockAuthService.generateSsoToken).toHaveBeenCalledWith(
                "user-id-123",
                SsoSurface.JAVA_DESKTOP,
                undefined,
            );
            expect(result).toBe(expected);
        });
    });

    describe("sso/exchange", () => {
        it("sets refresh cookie and returns token pair", async () => {
            const dto = { ssoToken: "valid-uuid", state: "abc" };
            const res = mockRes();
            mockAuthService.exchangeSsoToken.mockResolvedValue(mockTokenPair);

            const result = await controller.exchangeSsoToken(dto, res as any);

            expect(mockAuthService.exchangeSsoToken).toHaveBeenCalledWith(
                "valid-uuid",
                "abc",
            );
            expect(res.cookie).toHaveBeenCalledWith(
                "qc_rt",
                "refresh.token",
                expect.objectContaining({ httpOnly: true }),
            );
            expect(result).toBe(mockTokenPair);
        });
    });

    describe("refresh", () => {
        it("reads token from cookie when present", async () => {
            const req = { cookies: { qc_rt: "cookie.token" } };
            const res = mockRes();
            const dto = {};
            mockAuthService.refresh.mockResolvedValue(mockTokenPair);

            await controller.refresh(req as any, res as any, dto as any);

            expect(mockAuthService.refresh).toHaveBeenCalledWith(
                "cookie.token",
            );
            expect(res.cookie).toHaveBeenCalledWith(
                "qc_rt",
                "refresh.token",
                expect.objectContaining({ httpOnly: true }),
            );
        });

        it("falls back to body token when no cookie (desktop)", async () => {
            const req = { cookies: {} };
            const res = mockRes();
            const dto = { refreshToken: "body.token" };
            mockAuthService.refresh.mockResolvedValue(mockTokenPair);

            await controller.refresh(req as any, res as any, dto);

            expect(mockAuthService.refresh).toHaveBeenCalledWith("body.token");
        });
    });

    describe("logout", () => {
        it("clears cookie and delegates logout with jti", async () => {
            const req = {
                user: {
                    sub: "user-id-123",
                    email: "test@test.fr",
                    role: "resident",
                    jti: "some-jti",
                    exp: 9999999999,
                },
                cookies: {},
            };
            const res = mockRes();
            mockAuthService.logout.mockResolvedValue({ success: true });

            const result = await controller.logout(req as any, res as any);

            expect(res.clearCookie).toHaveBeenCalledWith("qc_rt", {
                path: "/",
            });
            expect(mockAuthService.logout).toHaveBeenCalledWith(
                "user-id-123",
                "some-jti",
                9999999999,
            );
            expect(result).toEqual({ success: true });
        });
    });
});
