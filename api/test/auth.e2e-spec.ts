import {
    ForbiddenException,
    INestApplication,
    UnauthorizedException,
    VersioningType,
} from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { App } from "supertest/types";
import * as packageJson from "../package.json";
import { AppModule } from "../src/app.module";
import { AuthService } from "../src/auth/auth.service";
import { JwtAuthGuard } from "../src/common/guards/jwt-auth.guard";

describe("AuthController (e2e)", () => {
    let app: INestApplication<App>;
    let jwtGuardCanActivateSpy: jest.SpyInstance;

    const majorVersion = packageJson.version.split(".")[0];

    const authServiceMock = {
        register: jest.fn(),
        login: jest.fn(),
        refresh: jest.fn(),
        logout: jest.fn(),
    };

    beforeAll(async () => {
        jwtGuardCanActivateSpy = jest
            .spyOn(JwtAuthGuard.prototype, "canActivate")
            .mockReturnValue(true);

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider("DRIZZLE")
            .useValue({
                execute: jest.fn().mockResolvedValue([{ result: 1 }]),
            })
            .overrideProvider(AuthService)
            .useValue(authServiceMock)
            .compile();

        app = moduleFixture.createNestApplication();
        app.enableVersioning({
            type: VersioningType.URI,
            defaultVersion: majorVersion,
        });
        await app.init();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        jwtGuardCanActivateSpy.mockReturnValue(true);
    });

    afterAll(async () => {
        jwtGuardCanActivateSpy.mockRestore();
        await app.close();
    });

    it(`/v${majorVersion}/auth/register (POST) returns 201`, async () => {
        const payload = {
            email: "new.user@example.com",
            password: "P@ssw0rd!",
            firstName: "New",
            lastName: "User",
        };

        const expected = {
            user: { id: "user-id", email: payload.email },
            accessToken: "access-token",
            refreshToken: "refresh-token",
        };

        authServiceMock.register.mockResolvedValue(expected);

        await request(app.getHttpServer())
            .post(`/v${majorVersion}/auth/register`)
            .send(payload)
            .expect(201)
            .expect(({ body }) => {
                expect(body).toEqual(expected);
            });

        expect(authServiceMock.register).toHaveBeenCalledWith(payload);
    });

    it(`/v${majorVersion}/auth/login (POST) returns 200`, async () => {
        const payload = {
            email: "john.doe@example.com",
            password: "P@ssw0rd!",
        };

        const expected = {
            user: { id: "user-id", email: payload.email },
            accessToken: "access-token",
            refreshToken: "refresh-token",
        };

        authServiceMock.login.mockResolvedValue(expected);

        await request(app.getHttpServer())
            .post(`/v${majorVersion}/auth/login`)
            .send(payload)
            .expect(200)
            .expect(({ body }) => {
                expect(body).toEqual(expected);
            });

        expect(authServiceMock.login).toHaveBeenCalledWith(payload);
    });

    it(`/v${majorVersion}/auth/refresh (POST) returns 200`, async () => {
        const payload = {
            refreshToken: "valid-refresh-token",
        };

        const expected = {
            accessToken: "new-access-token",
            refreshToken: "new-refresh-token",
        };

        authServiceMock.refresh.mockResolvedValue(expected);

        await request(app.getHttpServer())
            .post(`/v${majorVersion}/auth/refresh`)
            .send(payload)
            .expect(200)
            .expect(({ body }) => {
                expect(body).toEqual(expected);
            });

        expect(authServiceMock.refresh).toHaveBeenCalledWith(payload);
    });

    it(`/v${majorVersion}/auth/refresh (POST) returns 401 on invalid token`, async () => {
        authServiceMock.refresh.mockRejectedValue(
            new UnauthorizedException("Invalid refresh token"),
        );

        await request(app.getHttpServer())
            .post(`/v${majorVersion}/auth/refresh`)
            .send({ refreshToken: "invalid-token" })
            .expect(401);
    });

    it(`/v${majorVersion}/auth/refresh (POST) returns 403 on revoked token reuse`, async () => {
        authServiceMock.refresh.mockRejectedValue(
            new ForbiddenException(
                "Security alert: revoked refresh token used",
            ),
        );

        await request(app.getHttpServer())
            .post(`/v${majorVersion}/auth/refresh`)
            .send({ refreshToken: "revoked-token" })
            .expect(403);
    });

    it(`/v${majorVersion}/auth/logout (POST) returns 401 without auth`, async () => {
        jwtGuardCanActivateSpy.mockImplementation(() => {
            throw new UnauthorizedException("Unauthorized");
        });

        await request(app.getHttpServer())
            .post(`/v${majorVersion}/auth/logout`)
            .send({ userId: "6fce8b71-2d1a-4d4a-9c12-44d4624e8f81" })
            .expect(401);
    });

    it(`/v${majorVersion}/auth/logout (POST) returns 200 when authenticated`, async () => {
        const payload = { userId: "6fce8b71-2d1a-4d4a-9c12-44d4624e8f81" };
        const expected = { message: "Logged out successfully" };

        authServiceMock.logout.mockResolvedValue(expected);

        await request(app.getHttpServer())
            .post(`/v${majorVersion}/auth/logout`)
            .send(payload)
            .expect(200)
            .expect(({ body }) => {
                expect(body).toEqual(expected);
            });

        expect(authServiceMock.logout).toHaveBeenCalledWith(payload);
    });
});
