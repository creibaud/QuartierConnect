import { UnauthorizedException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import type { Request, Response } from "express";
import type { User } from "src/database/drizzle/schema";
import { AuthController } from "src/modules/auth/auth.controller";
import { AuthService } from "src/modules/auth/auth.service";
import { TotpService } from "src/modules/auth/totp.service";

describe("AuthController", () => {
    let controller: AuthController;

    const registerMock = jest.fn();
    const loginMock = jest.fn();
    const completeTotpLoginMock = jest.fn();
    const refreshMock = jest.fn();
    const logoutMock = jest.fn();
    const getRefreshCookieConfigMock = jest.fn();
    const generateTotpSetupMock = jest.fn();
    const verifyTotpSetupMock = jest.fn();
    const disableTotpMock = jest.fn();

    const ssoLoginMock = jest.fn();

    const authServiceMock = {
        register: registerMock,
        login: loginMock,
        completeTotpLogin: completeTotpLoginMock,
        refresh: refreshMock,
        logout: logoutMock,
        getRefreshCookieConfig: getRefreshCookieConfigMock,
        ssoLogin: ssoLoginMock,
    } as unknown as jest.Mocked<AuthService>;

    const totpServiceMock = {
        generateSetup: generateTotpSetupMock,
        verifySetup: verifyTotpSetupMock,
        disable: disableTotpMock,
    } as unknown as jest.Mocked<TotpService>;

    const fakeUser: User = {
        id: "6fce8b71-2d1a-4d4a-9c12-44d4624e8f81",
        email: "john.doe@example.com",
        password: "hashed",
        firstName: "John",
        lastName: "Doe",
        role: "resident",
        isActive: true,
        balance: "0.00",
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    beforeEach(async () => {
        jest.clearAllMocks();
        getRefreshCookieConfigMock.mockReturnValue({
            name: "refreshToken",
            path: "/auth/refresh",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthController],
            providers: [
                { provide: AuthService, useValue: authServiceMock },
                { provide: TotpService, useValue: totpServiceMock },
            ],
        }).compile();

        controller = module.get<AuthController>(AuthController);
    });

    it("register delegates to AuthService", async () => {
        const dto = {
            email: "john.doe@example.com",
            password: "P@ssw0rd!",
            firstName: "John",
            lastName: "Doe",
        };
        const serviceResult = {
            user: { id: "user-id" },
            accessToken: "access-token",
            refreshToken: "refresh-token",
        };
        const expected = {
            user: { id: "user-id" },
            accessToken: "access-token",
        };
        const cookieMock = jest.fn();
        const res = { cookie: cookieMock } as unknown as Response;

        registerMock.mockResolvedValue(serviceResult as never);

        await expect(controller.register(dto, res)).resolves.toEqual(expected);
        expect(registerMock).toHaveBeenCalledWith(dto);
        expect(cookieMock).toHaveBeenCalled();
    });

    it("login delegates to AuthService", async () => {
        const dto = { email: "john.doe@example.com", password: "P@ssw0rd!" };
        const serviceResult = {
            accessToken: "access-token",
            refreshToken: "refresh-token",
            user: fakeUser,
        };
        const expected = { accessToken: "access-token", user: fakeUser };
        const cookieMock = jest.fn();
        const res = { cookie: cookieMock } as unknown as Response;

        loginMock.mockResolvedValue(serviceResult as never);

        await expect(controller.login(dto, res)).resolves.toEqual(expected);
        expect(loginMock).toHaveBeenCalledWith(dto);
        expect(cookieMock).toHaveBeenCalled();
    });

    it("completeTotpLogin delegates to AuthService", async () => {
        const dto = { totpToken: "pending-token", code: "123456" };
        const serviceResult = {
            user: fakeUser,
            accessToken: "access-token",
            refreshToken: "refresh-token",
        };
        const expected = {
            user: fakeUser,
            accessToken: "access-token",
        };
        const cookieMock = jest.fn();
        const res = { cookie: cookieMock } as unknown as Response;

        completeTotpLoginMock.mockResolvedValue(serviceResult as never);

        await expect(controller.completeTotpLogin(dto, res)).resolves.toEqual(
            expected,
        );
        expect(completeTotpLoginMock).toHaveBeenCalledWith(dto);
        expect(cookieMock).toHaveBeenCalled();
    });

    it("refresh delegates to AuthService", async () => {
        const req = {
            cookies: { refreshToken: "refresh-token" },
        } as unknown as Request;
        const cookieMock = jest.fn();
        const res = { cookie: cookieMock } as unknown as Response;
        const serviceResult = {
            accessToken: "new-access-token",
            refreshToken: "next-refresh-token",
            user: fakeUser,
        };
        const expected = { accessToken: "new-access-token", user: fakeUser };

        refreshMock.mockResolvedValue(serviceResult as never);

        await expect(controller.refresh(req, res)).resolves.toEqual(expected);
        expect(refreshMock).toHaveBeenCalledWith({
            refreshToken: "refresh-token",
        });
        expect(cookieMock).toHaveBeenCalled();
    });

    it("refresh throws when cookie is missing", async () => {
        const req = { cookies: {} } as unknown as Request;
        const cookieMock = jest.fn();
        const res = { cookie: cookieMock } as unknown as Response;

        await expect(controller.refresh(req, res)).rejects.toBeInstanceOf(
            UnauthorizedException,
        );
        expect(refreshMock).not.toHaveBeenCalled();
    });

    it("logout delegates to AuthService", async () => {
        const user = { ...fakeUser };
        const expected = { message: "Logged out successfully" };
        const clearCookieMock = jest.fn();
        const res = { clearCookie: clearCookieMock } as unknown as Response;

        logoutMock.mockResolvedValue(expected as never);

        await expect(controller.logout(user, res)).resolves.toEqual(expected);
        expect(logoutMock).toHaveBeenCalledWith({
            userId: user.id,
        });
        expect(clearCookieMock).toHaveBeenCalledWith("refreshToken", {
            path: "/auth/refresh",
        });
    });

    it("totpSetup delegates to TotpService", async () => {
        const expected = {
            otpauthUrl: "otpauth://...",
            backupCodes: ["A1B2-C3D4"],
        };

        generateTotpSetupMock.mockResolvedValue(expected as never);

        await expect(controller.totpSetup(fakeUser)).resolves.toEqual(expected);
        expect(generateTotpSetupMock).toHaveBeenCalledWith(fakeUser.id);
    });

    it("totpVerify delegates to TotpService", async () => {
        const expected = { message: "TOTP successfully enabled" };

        verifyTotpSetupMock.mockResolvedValue(expected as never);

        await expect(
            controller.totpVerify(fakeUser, { code: "123456" }),
        ).resolves.toEqual(expected);
        expect(verifyTotpSetupMock).toHaveBeenCalledWith(fakeUser.id, "123456");
    });

    it("totpDisable delegates to TotpService", async () => {
        const expected = { message: "TOTP successfully disabled" };

        disableTotpMock.mockResolvedValue(expected as never);

        await expect(
            controller.totpDisable(fakeUser, { code: "123456" }),
        ).resolves.toEqual(expected);
        expect(disableTotpMock).toHaveBeenCalledWith(fakeUser.id, "123456");
    });

    describe("ssoLogin", () => {
        const ssoResponse = {
            accessToken: "desktop-token",
            tokenType: "Bearer",
            expiresIn: 86400,
            user: { id: fakeUser.id, email: fakeUser.email, role: "admin" },
        };

        it("delegates to AuthService.ssoLogin and returns token", async () => {
            const dto = {
                email: "admin@example.com",
                password: "P@ssw0rd!",
            };
            ssoLoginMock.mockResolvedValue(ssoResponse as never);

            await expect(controller.ssoLogin(dto)).resolves.toEqual(
                ssoResponse,
            );
            expect(ssoLoginMock).toHaveBeenCalledWith(dto);
        });

        it("passes totpCode when provided", async () => {
            const dto = {
                email: "admin@example.com",
                password: "P@ssw0rd!",
                totpCode: "123456",
            };
            ssoLoginMock.mockResolvedValue(ssoResponse as never);

            await controller.ssoLogin(dto);

            expect(ssoLoginMock).toHaveBeenCalledWith(dto);
        });

        it("propagates UnauthorizedException from AuthService", async () => {
            ssoLoginMock.mockRejectedValue(
                new (require("@nestjs/common").UnauthorizedException)(
                    "Invalid credentials",
                ) as never,
            );

            await expect(
                controller.ssoLogin({
                    email: "admin@example.com",
                    password: "wrong",
                }),
            ).rejects.toThrow("Invalid credentials");
        });

        it("propagates ForbiddenException when user is not admin", async () => {
            ssoLoginMock.mockRejectedValue(
                new (require("@nestjs/common").ForbiddenException)(
                    "Only administrators can use the desktop SSO",
                ) as never,
            );

            await expect(
                controller.ssoLogin({
                    email: "resident@example.com",
                    password: "P@ssw0rd!",
                }),
            ).rejects.toThrow("Only administrators can use the desktop SSO");
        });
    });
});
