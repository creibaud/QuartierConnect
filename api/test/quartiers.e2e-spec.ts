import { MailerService } from "@nestjs-modules/mailer";
import {
    INestApplication,
    NotFoundException,
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
import { QuartiersService } from "../src/modules/quartiers/quartiers.service";

describe("QuartiersController (e2e)", () => {
    let app: INestApplication<App>;
    let jwtGuardCanActivateSpy: jest.SpyInstance;

    const majorVersion = packageJson.version.split(".")[0];

    const quartiersServiceMock = {
        create: jest.fn(),
        findAll: jest.fn(),
        findOne: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        addMember: jest.fn(),
        removeMember: jest.fn(),
        getMembers: jest.fn(),
        getMyQuartier: jest.fn(),
    };

    const fakeUser = {
        id: "6fce8b71-2d1a-4d4a-9c12-44d4624e8f81",
        email: "john.doe@example.com",
        role: "resident",
    };

    const fakeAdminUser = {
        id: "admin-user-uuid-0000-000000000000",
        email: "admin@example.com",
        role: "admin",
    };

    const fakeQuartierId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

    const fakeQuartier = {
        id: fakeQuartierId,
        name: "Montmartre",
        description: "Historic neighbourhood",
        adminUserId: fakeAdminUser.id,
        mongoGeoId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        geojson: null,
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
            .useValue({
                command: jest.fn().mockResolvedValue({}),
                collection: jest.fn().mockReturnValue({}),
            })
            .overrideProvider("NEO4J")
            .useValue({
                verifyConnectivity: jest.fn().mockResolvedValue(undefined),
            })
            .overrideProvider(MailerService)
            .useValue({ sendMail: jest.fn() })
            .overrideProvider(QuartiersService)
            .useValue(quartiersServiceMock)
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
    });

    afterAll(async () => {
        jwtGuardCanActivateSpy.mockRestore();
        await app.close();
    });

    describe(`POST /v${majorVersion}/quartiers`, () => {
        it("returns 201 when admin creates a quartier", async () => {
            jwtGuardCanActivateSpy.mockImplementation(
                (ctx: ExecutionContext) => {
                    const req = ctx
                        .switchToHttp()
                        .getRequest<{ user: typeof fakeAdminUser }>();
                    req.user = fakeAdminUser;
                    return true;
                },
            );

            quartiersServiceMock.create.mockResolvedValue(fakeQuartier);

            const payload = {
                name: "Montmartre",
                description: "Historic neighbourhood",
                geojson: {
                    type: "Polygon",
                    coordinates: [
                        [
                            [2.34, 48.88],
                            [2.35, 48.88],
                            [2.35, 48.89],
                            [2.34, 48.88],
                        ],
                    ],
                },
            };

            await request(app.getHttpServer())
                .post(`/v${majorVersion}/quartiers`)
                .send(payload)
                .expect(201);

            expect(quartiersServiceMock.create).toHaveBeenCalledWith(
                fakeAdminUser.id,
                payload,
            );
        });

        it("returns 403 when non-admin tries to create a quartier", async () => {
            await request(app.getHttpServer())
                .post(`/v${majorVersion}/quartiers`)
                .send({ name: "Test", geojson: {} })
                .expect(403);
        });

        it("returns 401 when unauthenticated", async () => {
            jwtGuardCanActivateSpy.mockImplementation(() => {
                throw new UnauthorizedException("Unauthorized");
            });

            await request(app.getHttpServer())
                .post(`/v${majorVersion}/quartiers`)
                .send({ name: "Test", geojson: {} })
                .expect(401);
        });
    });

    describe(`GET /v${majorVersion}/quartiers`, () => {
        it("returns 200 with paginated list", async () => {
            const expected = {
                data: [fakeQuartier],
                meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
            };

            quartiersServiceMock.findAll.mockResolvedValue(expected);

            await request(app.getHttpServer())
                .get(`/v${majorVersion}/quartiers`)
                .expect(200)
                .expect(({ body }) => {
                    expect(body).toEqual(expected);
                });

            expect(quartiersServiceMock.findAll).toHaveBeenCalled();
        });

        it("returns 401 when unauthenticated", async () => {
            jwtGuardCanActivateSpy.mockImplementation(() => {
                throw new UnauthorizedException("Unauthorized");
            });

            await request(app.getHttpServer())
                .get(`/v${majorVersion}/quartiers`)
                .expect(401);
        });
    });

    describe(`GET /v${majorVersion}/quartiers/me`, () => {
        it("returns 200 with the current user quartier", async () => {
            quartiersServiceMock.getMyQuartier.mockResolvedValue(fakeQuartier);

            await request(app.getHttpServer())
                .get(`/v${majorVersion}/quartiers/me`)
                .expect(200)
                .expect(({ body }) => {
                    expect(body).toEqual(fakeQuartier);
                });

            expect(quartiersServiceMock.getMyQuartier).toHaveBeenCalledWith(
                fakeUser.id,
            );
        });

        it("returns 404 when user has no quartier", async () => {
            quartiersServiceMock.getMyQuartier.mockRejectedValue(
                new NotFoundException("You are not assigned to any quartier"),
            );

            await request(app.getHttpServer())
                .get(`/v${majorVersion}/quartiers/me`)
                .expect(404);
        });

        it("returns 401 when unauthenticated", async () => {
            jwtGuardCanActivateSpy.mockImplementation(() => {
                throw new UnauthorizedException("Unauthorized");
            });

            await request(app.getHttpServer())
                .get(`/v${majorVersion}/quartiers/me`)
                .expect(401);
        });
    });

    describe(`GET /v${majorVersion}/quartiers/:id`, () => {
        it("returns 200 with quartier details", async () => {
            quartiersServiceMock.findOne.mockResolvedValue(fakeQuartier);

            await request(app.getHttpServer())
                .get(`/v${majorVersion}/quartiers/${fakeQuartierId}`)
                .expect(200)
                .expect(({ body }) => {
                    expect(body).toEqual(fakeQuartier);
                });

            expect(quartiersServiceMock.findOne).toHaveBeenCalledWith(
                fakeQuartierId,
            );
        });

        it("returns 404 when quartier does not exist", async () => {
            quartiersServiceMock.findOne.mockRejectedValue(
                new NotFoundException("Quartier not found"),
            );

            await request(app.getHttpServer())
                .get(`/v${majorVersion}/quartiers/${fakeQuartierId}`)
                .expect(404);
        });

        it("returns 401 when unauthenticated", async () => {
            jwtGuardCanActivateSpy.mockImplementation(() => {
                throw new UnauthorizedException("Unauthorized");
            });

            await request(app.getHttpServer())
                .get(`/v${majorVersion}/quartiers/${fakeQuartierId}`)
                .expect(401);
        });
    });

    describe(`PATCH /v${majorVersion}/quartiers/:id`, () => {
        it("returns 200 when admin updates a quartier", async () => {
            jwtGuardCanActivateSpy.mockImplementation(
                (ctx: ExecutionContext) => {
                    const req = ctx
                        .switchToHttp()
                        .getRequest<{ user: typeof fakeAdminUser }>();
                    req.user = fakeAdminUser;
                    return true;
                },
            );

            const updated = { ...fakeQuartier, name: "Montmartre Updated" };
            quartiersServiceMock.update.mockResolvedValue(updated);

            await request(app.getHttpServer())
                .patch(`/v${majorVersion}/quartiers/${fakeQuartierId}`)
                .send({ name: "Montmartre Updated" })
                .expect(200)
                .expect(({ body }) => {
                    expect(body.name).toBe("Montmartre Updated");
                });

            expect(quartiersServiceMock.update).toHaveBeenCalledWith(
                fakeQuartierId,
                { name: "Montmartre Updated" },
            );
        });

        it("returns 403 when non-admin tries to update", async () => {
            await request(app.getHttpServer())
                .patch(`/v${majorVersion}/quartiers/${fakeQuartierId}`)
                .send({ name: "Attempt" })
                .expect(403);
        });

        it("returns 404 when quartier does not exist", async () => {
            jwtGuardCanActivateSpy.mockImplementation(
                (ctx: ExecutionContext) => {
                    const req = ctx
                        .switchToHttp()
                        .getRequest<{ user: typeof fakeAdminUser }>();
                    req.user = fakeAdminUser;
                    return true;
                },
            );

            quartiersServiceMock.update.mockRejectedValue(
                new NotFoundException("Quartier not found"),
            );

            await request(app.getHttpServer())
                .patch(`/v${majorVersion}/quartiers/${fakeQuartierId}`)
                .send({ name: "Ghost" })
                .expect(404);
        });
    });

    describe(`DELETE /v${majorVersion}/quartiers/:id`, () => {
        it("returns 200 when admin deletes a quartier", async () => {
            jwtGuardCanActivateSpy.mockImplementation(
                (ctx: ExecutionContext) => {
                    const req = ctx
                        .switchToHttp()
                        .getRequest<{ user: typeof fakeAdminUser }>();
                    req.user = fakeAdminUser;
                    return true;
                },
            );

            quartiersServiceMock.delete.mockResolvedValue(undefined);

            await request(app.getHttpServer())
                .delete(`/v${majorVersion}/quartiers/${fakeQuartierId}`)
                .expect(200);

            expect(quartiersServiceMock.delete).toHaveBeenCalledWith(
                fakeQuartierId,
            );
        });

        it("returns 403 when non-admin tries to delete", async () => {
            await request(app.getHttpServer())
                .delete(`/v${majorVersion}/quartiers/${fakeQuartierId}`)
                .expect(403);
        });

        it("returns 404 when quartier does not exist", async () => {
            jwtGuardCanActivateSpy.mockImplementation(
                (ctx: ExecutionContext) => {
                    const req = ctx
                        .switchToHttp()
                        .getRequest<{ user: typeof fakeAdminUser }>();
                    req.user = fakeAdminUser;
                    return true;
                },
            );

            quartiersServiceMock.delete.mockRejectedValue(
                new NotFoundException("Quartier not found"),
            );

            await request(app.getHttpServer())
                .delete(`/v${majorVersion}/quartiers/${fakeQuartierId}`)
                .expect(404);
        });
    });

    describe(`POST /v${majorVersion}/quartiers/:id/members`, () => {
        const memberUserId = "b2c3d4e5-f6a7-8901-bcde-f12345678901";

        it("returns 201 when admin adds a member", async () => {
            jwtGuardCanActivateSpy.mockImplementation(
                (ctx: ExecutionContext) => {
                    const req = ctx
                        .switchToHttp()
                        .getRequest<{ user: typeof fakeAdminUser }>();
                    req.user = fakeAdminUser;
                    return true;
                },
            );

            quartiersServiceMock.addMember.mockResolvedValue(undefined);

            await request(app.getHttpServer())
                .post(`/v${majorVersion}/quartiers/${fakeQuartierId}/members`)
                .send({ userId: memberUserId })
                .expect(201);

            expect(quartiersServiceMock.addMember).toHaveBeenCalledWith(
                fakeQuartierId,
                { userId: memberUserId },
            );
        });

        it("returns 403 when non-admin tries to add a member", async () => {
            await request(app.getHttpServer())
                .post(`/v${majorVersion}/quartiers/${fakeQuartierId}/members`)
                .send({ userId: memberUserId })
                .expect(403);
        });

        it("returns 404 when quartier does not exist", async () => {
            jwtGuardCanActivateSpy.mockImplementation(
                (ctx: ExecutionContext) => {
                    const req = ctx
                        .switchToHttp()
                        .getRequest<{ user: typeof fakeAdminUser }>();
                    req.user = fakeAdminUser;
                    return true;
                },
            );

            quartiersServiceMock.addMember.mockRejectedValue(
                new NotFoundException("Quartier not found"),
            );

            await request(app.getHttpServer())
                .post(`/v${majorVersion}/quartiers/${fakeQuartierId}/members`)
                .send({ userId: memberUserId })
                .expect(404);
        });
    });

    describe(`DELETE /v${majorVersion}/quartiers/:id/members/:userId`, () => {
        const memberUserId = "b2c3d4e5-f6a7-8901-bcde-f12345678901";

        it("returns 200 when admin removes a member", async () => {
            jwtGuardCanActivateSpy.mockImplementation(
                (ctx: ExecutionContext) => {
                    const req = ctx
                        .switchToHttp()
                        .getRequest<{ user: typeof fakeAdminUser }>();
                    req.user = fakeAdminUser;
                    return true;
                },
            );

            quartiersServiceMock.removeMember.mockResolvedValue(undefined);

            await request(app.getHttpServer())
                .delete(
                    `/v${majorVersion}/quartiers/${fakeQuartierId}/members/${memberUserId}`,
                )
                .expect(200);

            expect(quartiersServiceMock.removeMember).toHaveBeenCalledWith(
                fakeQuartierId,
                memberUserId,
            );
        });

        it("returns 403 when non-admin tries to remove a member", async () => {
            await request(app.getHttpServer())
                .delete(
                    `/v${majorVersion}/quartiers/${fakeQuartierId}/members/${memberUserId}`,
                )
                .expect(403);
        });
    });

    describe(`GET /v${majorVersion}/quartiers/:id/members`, () => {
        it("returns 200 with paginated member list", async () => {
            jwtGuardCanActivateSpy.mockImplementation(
                (ctx: ExecutionContext) => {
                    const req = ctx
                        .switchToHttp()
                        .getRequest<{ user: typeof fakeAdminUser }>();
                    req.user = fakeAdminUser;
                    return true;
                },
            );

            const expected = {
                data: [
                    {
                        id: fakeUser.id,
                        email: fakeUser.email,
                        firstName: "John",
                        lastName: "Doe",
                        role: "resident",
                        isActive: true,
                        addedAt: new Date().toISOString(),
                    },
                ],
                meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
            };

            quartiersServiceMock.getMembers.mockResolvedValue(expected);

            await request(app.getHttpServer())
                .get(`/v${majorVersion}/quartiers/${fakeQuartierId}/members`)
                .expect(200)
                .expect(({ body }) => {
                    expect(body).toEqual(expected);
                });

            expect(quartiersServiceMock.getMembers).toHaveBeenCalled();
        });

        it("returns 403 when non-admin tries to list members", async () => {
            await request(app.getHttpServer())
                .get(`/v${majorVersion}/quartiers/${fakeQuartierId}/members`)
                .expect(403);
        });

        it("returns 401 when unauthenticated", async () => {
            jwtGuardCanActivateSpy.mockImplementation(() => {
                throw new UnauthorizedException("Unauthorized");
            });

            await request(app.getHttpServer())
                .get(`/v${majorVersion}/quartiers/${fakeQuartierId}/members`)
                .expect(401);
        });
    });
});
