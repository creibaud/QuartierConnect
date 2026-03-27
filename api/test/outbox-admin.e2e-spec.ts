import { MailerService } from "@nestjs-modules/mailer";
import {
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
import { OutboxDispatcherService } from "../src/modules/outbox/outbox-dispatcher.service";

describe("Outbox Admin (e2e)", () => {
    let app: INestApplication<App>;
    let jwtGuardCanActivateSpy: jest.SpyInstance;

    const majorVersion = packageJson.version.split(".")[0];

    const outboxDispatcherMock = {
        dispatchPendingBatch: jest.fn().mockResolvedValue({ processed: 3 }),
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
            .overrideProvider(OutboxDispatcherService)
            .useValue(outboxDispatcherMock)
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
        outboxDispatcherMock.dispatchPendingBatch.mockResolvedValue({
            processed: 3,
        });
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

    it(`/v${majorVersion}/admin/outbox/run (POST) triggers manual outbox batch`, async () => {
        await request(app.getHttpServer())
            .post(`/v${majorVersion}/admin/outbox/run`)
            .expect(201)
            .expect(({ body }) => {
                expect(body).toEqual({ processed: 3 });
            });

        expect(outboxDispatcherMock.dispatchPendingBatch).toHaveBeenCalledWith(
            50,
        );
    });

    it(`/v${majorVersion}/admin/outbox/run?limit=10 (POST) passes custom limit`, async () => {
        await request(app.getHttpServer())
            .post(`/v${majorVersion}/admin/outbox/run?limit=10`)
            .expect(201);

        expect(outboxDispatcherMock.dispatchPendingBatch).toHaveBeenCalledWith(
            10,
        );
    });

    it(`/v${majorVersion}/admin/outbox/run (POST) returns 401 without auth`, async () => {
        jwtGuardCanActivateSpy.mockImplementation(() => {
            throw new UnauthorizedException("Unauthorized");
        });

        await request(app.getHttpServer())
            .post(`/v${majorVersion}/admin/outbox/run`)
            .expect(401);
    });

    it(`/v${majorVersion}/admin/outbox/run (POST) returns 403 for non-admin user`, async () => {
        jwtGuardCanActivateSpy.mockImplementation((ctx: ExecutionContext) => {
            const req = ctx
                .switchToHttp()
                .getRequest<{ user: typeof fakeResidentUser }>();
            req.user = fakeResidentUser;
            return true;
        });

        await request(app.getHttpServer())
            .post(`/v${majorVersion}/admin/outbox/run`)
            .expect(403);
    });
});
