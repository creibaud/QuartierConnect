import { MailerService } from "@nestjs-modules/mailer";
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
import { AdminService } from "../src/modules/admin/admin.service";

describe("AdminController (e2e)", () => {
    let app: INestApplication<App>;
    let jwtGuardCanActivateSpy: jest.SpyInstance;

    const majorVersion = packageJson.version.split(".")[0];

    const adminServiceMock = {
        getGlobalStats: jest.fn(),
        getEventStats: jest.fn(),
        getServiceStats: jest.fn(),
        getMessageStats: jest.fn(),
        getVoteStats: jest.fn(),
        getUserStats: jest.fn(),
    };

    const fakeAdminUser = {
        id: "admin-user-id",
        email: "admin@example.com",
        role: "admin",
    };

    const fakeResidentUser = {
        id: "resident-user-id",
        email: "resident@example.com",
        role: "resident",
    };

    beforeAll(async () => {
        jwtGuardCanActivateSpy = jest
            .spyOn(JwtAuthGuard.prototype, "canActivate")
            .mockImplementation((ctx: ExecutionContext) => {
                const req = ctx
                    .switchToHttp()
                    .getRequest<{ user: typeof fakeAdminUser }>();
                req.user = fakeAdminUser;
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
            .overrideProvider(MailerService)
            .useValue({ sendMail: jest.fn() })
            .overrideProvider(AdminService)
            .useValue(adminServiceMock)
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
                .getRequest<{ user: typeof fakeAdminUser }>();
            req.user = fakeAdminUser;
            return true;
        });
    });

    afterAll(async () => {
        jwtGuardCanActivateSpy.mockRestore();
        await app.close();
    });

    it(`/v${majorVersion}/admin/stats (GET) returns 200 with global stats`, async () => {
        const stats = {
            users: 42,
            quartiers: 5,
            incidents: 10,
            events: 20,
            services: 15,
            messages: 300,
            votes: 8,
        };
        adminServiceMock.getGlobalStats.mockResolvedValue(stats);

        await request(app.getHttpServer())
            .get(`/v${majorVersion}/admin/stats`)
            .expect(200)
            .expect(({ body }) => {
                expect(body).toEqual(stats);
            });

        expect(adminServiceMock.getGlobalStats).toHaveBeenCalled();
    });

    it(`/v${majorVersion}/admin/stats (GET) returns 401 without auth`, async () => {
        jwtGuardCanActivateSpy.mockImplementation(() => {
            throw new UnauthorizedException("Unauthorized");
        });

        await request(app.getHttpServer())
            .get(`/v${majorVersion}/admin/stats`)
            .expect(401);
    });

    it(`/v${majorVersion}/admin/stats (GET) returns 403 for non-admin user`, async () => {
        jwtGuardCanActivateSpy.mockImplementation((ctx: ExecutionContext) => {
            const req = ctx
                .switchToHttp()
                .getRequest<{ user: typeof fakeResidentUser }>();
            req.user = fakeResidentUser;
            return true;
        });

        await request(app.getHttpServer())
            .get(`/v${majorVersion}/admin/stats`)
            .expect(403);
    });

    it(`/v${majorVersion}/admin/stats/events (GET) returns 200 with event stats`, async () => {
        const stats = {
            byCategory: [{ category: "sport", count: 5 }],
            registrationStats: { totalRegistrations: 50, avgRegistrations: 10 },
        };
        adminServiceMock.getEventStats.mockResolvedValue(stats);

        await request(app.getHttpServer())
            .get(`/v${majorVersion}/admin/stats/events`)
            .expect(200)
            .expect(({ body }) => {
                expect(body).toEqual(stats);
            });

        expect(adminServiceMock.getEventStats).toHaveBeenCalledWith(undefined);
    });

    it(`/v${majorVersion}/admin/stats/events (GET) with period query passes period to service`, async () => {
        const stats = {
            byCategory: [],
            registrationStats: { totalRegistrations: 0, avgRegistrations: 0 },
        };
        adminServiceMock.getEventStats.mockResolvedValue(stats);

        await request(app.getHttpServer())
            .get(`/v${majorVersion}/admin/stats/events?period=week`)
            .expect(200);

        expect(adminServiceMock.getEventStats).toHaveBeenCalledWith("week");
    });

    it(`/v${majorVersion}/admin/stats/events (GET) returns 403 for non-admin user`, async () => {
        jwtGuardCanActivateSpy.mockImplementation((ctx: ExecutionContext) => {
            const req = ctx
                .switchToHttp()
                .getRequest<{ user: typeof fakeResidentUser }>();
            req.user = fakeResidentUser;
            return true;
        });

        await request(app.getHttpServer())
            .get(`/v${majorVersion}/admin/stats/events`)
            .expect(403);
    });

    it(`/v${majorVersion}/admin/stats/services (GET) returns 200 with service stats`, async () => {
        const stats = {
            byCategory: [{ category: "plumbing", count: 3 }],
            byType: [{ type: "offer", count: 5 }],
            byStatus: [{ status: "active", count: 4 }],
        };
        adminServiceMock.getServiceStats.mockResolvedValue(stats);

        await request(app.getHttpServer())
            .get(`/v${majorVersion}/admin/stats/services`)
            .expect(200)
            .expect(({ body }) => {
                expect(body).toEqual(stats);
            });

        expect(adminServiceMock.getServiceStats).toHaveBeenCalled();
    });

    it(`/v${majorVersion}/admin/stats/services (GET) returns 403 for non-admin user`, async () => {
        jwtGuardCanActivateSpy.mockImplementation((ctx: ExecutionContext) => {
            const req = ctx
                .switchToHttp()
                .getRequest<{ user: typeof fakeResidentUser }>();
            req.user = fakeResidentUser;
            return true;
        });

        await request(app.getHttpServer())
            .get(`/v${majorVersion}/admin/stats/services`)
            .expect(403);
    });

    it(`/v${majorVersion}/admin/stats/messages (GET) returns 200 with message stats`, async () => {
        const stats = {
            total: 500,
            last7Days: [{ date: "2026-03-20", count: 30 }],
        };
        adminServiceMock.getMessageStats.mockResolvedValue(stats);

        await request(app.getHttpServer())
            .get(`/v${majorVersion}/admin/stats/messages`)
            .expect(200)
            .expect(({ body }) => {
                expect(body).toEqual(stats);
            });

        expect(adminServiceMock.getMessageStats).toHaveBeenCalled();
    });

    it(`/v${majorVersion}/admin/stats/messages (GET) returns 403 for non-admin user`, async () => {
        jwtGuardCanActivateSpy.mockImplementation((ctx: ExecutionContext) => {
            const req = ctx
                .switchToHttp()
                .getRequest<{ user: typeof fakeResidentUser }>();
            req.user = fakeResidentUser;
            return true;
        });

        await request(app.getHttpServer())
            .get(`/v${majorVersion}/admin/stats/messages`)
            .expect(403);
    });

    it(`/v${majorVersion}/admin/stats/votes (GET) returns 200 with vote stats`, async () => {
        const stats = {
            byType: [{ type: "poll", count: 4 }],
            totalResponses: 120,
        };
        adminServiceMock.getVoteStats.mockResolvedValue(stats);

        await request(app.getHttpServer())
            .get(`/v${majorVersion}/admin/stats/votes`)
            .expect(200)
            .expect(({ body }) => {
                expect(body).toEqual(stats);
            });

        expect(adminServiceMock.getVoteStats).toHaveBeenCalled();
    });

    it(`/v${majorVersion}/admin/stats/votes (GET) returns 403 for non-admin user`, async () => {
        jwtGuardCanActivateSpy.mockImplementation((ctx: ExecutionContext) => {
            const req = ctx
                .switchToHttp()
                .getRequest<{ user: typeof fakeResidentUser }>();
            req.user = fakeResidentUser;
            return true;
        });

        await request(app.getHttpServer())
            .get(`/v${majorVersion}/admin/stats/votes`)
            .expect(403);
    });

    it(`/v${majorVersion}/admin/stats/users (GET) returns 200 with user stats`, async () => {
        const stats = {
            byRole: [
                { role: "resident", count: 38 },
                { role: "admin", count: 4 },
            ],
            byStatus: [
                { isActive: true, count: 40 },
                { isActive: false, count: 2 },
            ],
        };
        adminServiceMock.getUserStats.mockResolvedValue(stats);

        await request(app.getHttpServer())
            .get(`/v${majorVersion}/admin/stats/users`)
            .expect(200)
            .expect(({ body }) => {
                expect(body).toEqual(stats);
            });

        expect(adminServiceMock.getUserStats).toHaveBeenCalled();
    });

    it(`/v${majorVersion}/admin/stats/users (GET) returns 403 for non-admin user`, async () => {
        jwtGuardCanActivateSpy.mockImplementation((ctx: ExecutionContext) => {
            const req = ctx
                .switchToHttp()
                .getRequest<{ user: typeof fakeResidentUser }>();
            req.user = fakeResidentUser;
            return true;
        });

        await request(app.getHttpServer())
            .get(`/v${majorVersion}/admin/stats/users`)
            .expect(403);
    });
});
