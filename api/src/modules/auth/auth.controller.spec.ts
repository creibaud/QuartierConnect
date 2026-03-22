import { Test, TestingModule } from "@nestjs/testing";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

describe("AuthController", () => {
    let controller: AuthController;

    const authServiceMock = {
        register: jest.fn(),
        login: jest.fn(),
        refresh: jest.fn(),
        logout: jest.fn(),
    } as unknown as jest.Mocked<
        Pick<AuthService, "register" | "login" | "refresh" | "logout">
    >;

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthController],
            providers: [{ provide: AuthService, useValue: authServiceMock }],
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
});
