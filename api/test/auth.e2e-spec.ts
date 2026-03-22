import {
    ForbiddenException,
    INestApplication,
    UnauthorizedException,
    VersioningType,
} from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import type { NextFunction, Request, Response } from "express";
import request from "supertest";
import { App } from "supertest/types";
import * as packageJson from "../package.json";
import { AppModule } from "../src/app.module";
import { JwtAuthGuard } from "../src/common/guards/jwt-auth.guard";
import { AuthService } from "../src/modules/auth/auth.service";

describe("AuthController (e2e)", () => {
    let app: INestApplication<App>;
    let jwtGuardCanActivateSpy: jest.SpyInstance;

    const majorVersion = packageJson.version.split(".")[0];

    const authServiceMock = {
        register: jest.fn(),
        login: jest.fn(),
        refresh: jest.fn(),
        logout: jest.fn(),
        getRefreshCookieConfig: jest.fn(),
    };

    const fakeUser = {
        id: "6fce8b71-2d1a-4d4a-9c12-44d4624e8f81",
        email: "john.doe@example.com",
        role: "resident",
    };

    beforeAll(async () => {
        jwtGuardCanActivateSpy = jest
            .spyOn(JwtAuthGuard.prototype, "canActivate")
            .mockImplementation((ctx: ExecutionContext) => {
                const req = ctx
                    .switchToHttp()
                    .getRequest<{ user: typeof fakeUser }>();
                req.user = fakeUser;
                return true;
            });

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider("DRIZZLE")
            .useValue({ execute: jest.fn().mockResolvedValue([{ result: 1 }]) })
            .overrideProvider("MONGODB")
            .useValue({ command: jest.fn().mockResolvedValue({}) })
            .overrideProvider("NEO4J")
            .useValue({
                verifyConnectivity: jest.fn().mockResolvedValue(undefined),
            })
            .overrideProvider(AuthService)
            .useValue(authServiceMock)
            .compile();

        app = moduleFixture.createNestApplication();
        app.use(
            (
                req: Request & { cookies?: Record<string, string> },
                _res: Response,
                next: NextFunction,
            ) => {
                const rawCookieHeader = req.headers.cookie;
                const parsed: Record<string, string> = {};

                const rawCookie = Array.isArray(rawCookieHeader)
                    ? rawCookieHeader.join(";")
                    : rawCookieHeader;

                if (typeof rawCookie === "string") {
                    for (const pair of rawCookie.split(";")) {
                        const [name, ...rest] = pair.trim().split("=");
                        if (!name || rest.length === 0) {
                            continue;
                        }
                        parsed[name] = decodeURIComponent(rest.join("="));
                    }
                }

                req.cookies = parsed;
                next();
            },
        );
        app.enableVersioning({
            type: VersioningType.URI,
            defaultVersion: majorVersion,
        });
        await app.init();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        jwtGuardCanActivateSpy.mockImplementation((ctx: ExecutionContext) => {
            const req = ctx
                .switchToHttp()
                .getRequest<{ user: typeof fakeUser }>();
            req.user = fakeUser;
            return true;
        });
        authServiceMock.getRefreshCookieConfig.mockReturnValue({
            name: "refresh_token",
            path: "/v1/auth/refresh",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
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
        };

        const serviceResult = {
            ...expected,
            refreshToken: "refresh-token",
        };

        authServiceMock.register.mockResolvedValue(serviceResult);

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
        };

        const serviceResult = {
            ...expected,
            refreshToken: "refresh-token",
        };

        authServiceMock.login.mockResolvedValue(serviceResult);

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
        const expected = {
            accessToken: "new-access-token",
            user: { id: "user-id", email: "john.doe@example.com" },
        };

        const serviceResult = {
            ...expected,
            refreshToken: "new-refresh-token",
        };

        authServiceMock.refresh.mockResolvedValue(serviceResult);

        await request(app.getHttpServer())
            .post(`/v${majorVersion}/auth/refresh`)
            .set("Cookie", ["refresh_token=valid-refresh-token"])
            .expect(200)
            .expect(({ body }) => {
                expect(body).toEqual(expected);
            });

        expect(authServiceMock.refresh).toHaveBeenCalledWith({
            refreshToken: "valid-refresh-token",
        });
    });

    it(`/v${majorVersion}/auth/refresh (POST) returns 401 on invalid token`, async () => {
        authServiceMock.refresh.mockRejectedValue(
            new UnauthorizedException("Invalid refresh token"),
        );

        await request(app.getHttpServer())
            .post(`/v${majorVersion}/auth/refresh`)
            .set("Cookie", ["refresh_token=invalid-token"])
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
            .set("Cookie", ["refresh_token=revoked-token"])
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
        const expected = { message: "Logged out successfully" };

        authServiceMock.logout.mockResolvedValue(expected);

        await request(app.getHttpServer())
            .post(`/v${majorVersion}/auth/logout`)
            .expect(200)
            .expect(({ body }) => {
                expect(body).toEqual(expected);
            });

        expect(authServiceMock.logout).toHaveBeenCalledWith({
            userId: fakeUser.id,
        });
    });
});
