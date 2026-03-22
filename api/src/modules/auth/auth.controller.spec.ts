import { Test, TestingModule } from "@nestjs/testing";
import type { User } from "src/database/drizzle/schema";
import { AuthController } from "src/modules/auth/auth.controller";
import { AuthService } from "src/modules/auth/auth.service";
import { TotpService } from "src/modules/auth/totp.service";

describe("AuthController", () => {
    let controller: AuthController;

    const authServiceMock = {
        register: jest.fn(),
        login: jest.fn(),
        completeTotpLogin: jest.fn(),
        refresh: jest.fn(),
        logout: jest.fn(),
    } as unknown as jest.Mocked<AuthService>;

    const totpServiceMock = {
        generateSetup: jest.fn(),
        verifySetup: jest.fn(),
        disable: jest.fn(),
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
        const expected = { user: { id: "user-id" } };

        authServiceMock.register.mockResolvedValue(expected as never);

        await expect(controller.register(dto)).resolves.toEqual(expected);
        expect(authServiceMock.register).toHaveBeenCalledWith(dto);
    });

    it("login delegates to AuthService", async () => {
        const dto = { email: "john.doe@example.com", password: "P@ssw0rd!" };
        const expected = { accessToken: "access-token" };

        authServiceMock.login.mockResolvedValue(expected as never);

        await expect(controller.login(dto)).resolves.toEqual(expected);
        expect(authServiceMock.login).toHaveBeenCalledWith(dto);
    });

    it("completeTotpLogin delegates to AuthService", async () => {
        const dto = { totpToken: "pending-token", code: "123456" };
        const expected = {
            user: fakeUser,
            accessToken: "access-token",
            refreshToken: "refresh-token",
        };

        authServiceMock.completeTotpLogin.mockResolvedValue(expected as never);

        await expect(controller.completeTotpLogin(dto)).resolves.toEqual(
            expected,
        );
        expect(authServiceMock.completeTotpLogin).toHaveBeenCalledWith(dto);
    });

    it("refresh delegates to AuthService", async () => {
        const dto = { refreshToken: "refresh-token" };
        const expected = { accessToken: "new-access-token" };

        authServiceMock.refresh.mockResolvedValue(expected as never);

        await expect(controller.refresh(dto)).resolves.toEqual(expected);
        expect(authServiceMock.refresh).toHaveBeenCalledWith(dto);
    });

    it("logout delegates to AuthService", async () => {
        const dto = { userId: "6fce8b71-2d1a-4d4a-9c12-44d4624e8f81" };
        const expected = { message: "Logged out successfully" };

        authServiceMock.logout.mockResolvedValue(expected as never);

        await expect(controller.logout(dto)).resolves.toEqual(expected);
        expect(authServiceMock.logout).toHaveBeenCalledWith(dto);
    });

    it("totpSetup delegates to TotpService", async () => {
        const expected = {
            otpauthUrl: "otpauth://...",
            backupCodes: ["A1B2-C3D4"],
        };

        totpServiceMock.generateSetup.mockResolvedValue(expected as never);

        await expect(controller.totpSetup(fakeUser)).resolves.toEqual(expected);
        expect(totpServiceMock.generateSetup).toHaveBeenCalledWith(fakeUser.id);
    });

    it("totpVerify delegates to TotpService", async () => {
        const expected = { message: "TOTP successfully enabled" };

        totpServiceMock.verifySetup.mockResolvedValue(expected as never);

        await expect(
            controller.totpVerify(fakeUser, { code: "123456" }),
        ).resolves.toEqual(expected);
        expect(totpServiceMock.verifySetup).toHaveBeenCalledWith(
            fakeUser.id,
            "123456",
        );
    });

    it("totpDisable delegates to TotpService", async () => {
        const expected = { message: "TOTP successfully disabled" };

        totpServiceMock.disable.mockResolvedValue(expected as never);

        await expect(
            controller.totpDisable(fakeUser, { code: "123456" }),
        ).resolves.toEqual(expected);
        expect(totpServiceMock.disable).toHaveBeenCalledWith(
            fakeUser.id,
            "123456",
        );
    });
});
