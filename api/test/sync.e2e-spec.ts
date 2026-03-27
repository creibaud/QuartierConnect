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
import { SyncService } from "../src/modules/sync/sync.service";

describe("SyncController (e2e)", () => {
    let app: INestApplication<App>;
    let jwtGuardCanActivateSpy: jest.SpyInstance;

    const majorVersion = packageJson.version.split(".")[0];

    const syncServiceMock = {
        getDelta: jest.fn(),
        pushMutations: jest.fn(),
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
            .overrideProvider(SyncService)
            .useValue(syncServiceMock)
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

    it(`/v${majorVersion}/sync/delta (GET) returns 200 with delta changes`, async () => {
        const lastSyncTimestamp = "2026-03-20T00:00:00.000Z";
        const delta = {
            incidents: [{ id: "inc-1", title: "Road issue", status: "open" }],
            syncedAt: new Date().toISOString(),
        };
        syncServiceMock.getDelta.mockResolvedValue(delta);

        await request(app.getHttpServer())
            .get(
                `/v${majorVersion}/sync/delta?lastSyncTimestamp=${lastSyncTimestamp}`,
            )
            .expect(200)
            .expect(({ body }) => {
                expect(body).toEqual(delta);
            });

        expect(syncServiceMock.getDelta).toHaveBeenCalledWith(
            new Date(lastSyncTimestamp),
        );
    });

    it(`/v${majorVersion}/sync/delta (GET) returns 401 without auth`, async () => {
        jwtGuardCanActivateSpy.mockImplementation(() => {
            throw new UnauthorizedException("Unauthorized");
        });

        await request(app.getHttpServer())
            .get(
                `/v${majorVersion}/sync/delta?lastSyncTimestamp=2026-03-20T00:00:00.000Z`,
            )
            .expect(401);
    });

    it(`/v${majorVersion}/sync/delta (GET) returns 403 for non-admin user`, async () => {
        jwtGuardCanActivateSpy.mockImplementation((ctx: ExecutionContext) => {
            const req = ctx
                .switchToHttp()
                .getRequest<{ user: typeof fakeResidentUser }>();
            req.user = fakeResidentUser;
            return true;
        });

        await request(app.getHttpServer())
            .get(
                `/v${majorVersion}/sync/delta?lastSyncTimestamp=2026-03-20T00:00:00.000Z`,
            )
            .expect(403);
    });

    it(`/v${majorVersion}/sync/push (POST) returns 201 with sync result`, async () => {
        const dto = {
            mutations: [
                {
                    entityType: "incident",
                    entityId: "inc-1",
                    operation: "update",
                    clientTimestamp: "2026-03-25T10:00:00.000Z",
                    data: { status: "resolved" },
                },
            ],
        };
        const result = { applied: 1, skipped: 0, conflicts: [] };
        syncServiceMock.pushMutations.mockResolvedValue(result);

        await request(app.getHttpServer())
            .post(`/v${majorVersion}/sync/push`)
            .send(dto)
            .expect(201)
            .expect(({ body }) => {
                expect(body).toEqual(result);
            });

        expect(syncServiceMock.pushMutations).toHaveBeenCalledWith(
            dto.mutations,
            fakeAdminUser.id,
        );
    });

    it(`/v${majorVersion}/sync/push (POST) returns 401 without auth`, async () => {
        jwtGuardCanActivateSpy.mockImplementation(() => {
            throw new UnauthorizedException("Unauthorized");
        });

        await request(app.getHttpServer())
            .post(`/v${majorVersion}/sync/push`)
            .send({ mutations: [] })
            .expect(401);
    });

    it(`/v${majorVersion}/sync/push (POST) returns 403 for non-admin user`, async () => {
        jwtGuardCanActivateSpy.mockImplementation((ctx: ExecutionContext) => {
            const req = ctx
                .switchToHttp()
                .getRequest<{ user: typeof fakeResidentUser }>();
            req.user = fakeResidentUser;
            return true;
        });

        await request(app.getHttpServer())
            .post(`/v${majorVersion}/sync/push`)
            .send({ mutations: [] })
            .expect(403);
    });

    it(`/v${majorVersion}/sync/push (POST) returns 201 with conflicts when timestamps clash`, async () => {
        const dto = {
            mutations: [
                {
                    entityType: "incident",
                    entityId: "inc-2",
                    operation: "update",
                    clientTimestamp: "2026-03-01T00:00:00.000Z",
                    data: { status: "resolved" },
                },
            ],
        };
        const result = {
            applied: 0,
            skipped: 1,
            conflicts: [
                {
                    entityId: "inc-2",
                    reason: "Server timestamp is newer (server wins)",
                    clientTimestamp: "2026-03-01T00:00:00.000Z",
                    serverUpdatedAt: new Date(
                        "2026-03-10T00:00:00.000Z",
                    ).toISOString(),
                },
            ],
        };
        syncServiceMock.pushMutations.mockResolvedValue(result);

        await request(app.getHttpServer())
            .post(`/v${majorVersion}/sync/push`)
            .send(dto)
            .expect(201)
            .expect(({ body }) => {
                expect(body).toEqual(result);
            });
    });
});
