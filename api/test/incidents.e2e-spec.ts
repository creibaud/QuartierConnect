import { MailerService } from "@nestjs-modules/mailer";
import {
    ForbiddenException,
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
import { IncidentsService } from "../src/modules/incidents/incidents.service";

describe("IncidentsController (e2e)", () => {
    let app: INestApplication<App>;
    let jwtGuardCanActivateSpy: jest.SpyInstance;

    const majorVersion = packageJson.version.split(".")[0];

    const incidentsServiceMock = {
        create: jest.fn(),
        findAll: jest.fn(),
        findOne: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        addComment: jest.fn(),
        getComments: jest.fn(),
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

    const fakeIncidentId = "c1d2e3f4-a5b6-7890-cdef-012345678901";

    const fakeIncident = {
        id: fakeIncidentId,
        creatorId: fakeUser.id,
        title: "Broken streetlight",
        description: "The streetlight on Rue de Rivoli is broken",
        priority: "medium",
        status: "open",
        locationGeojson: null,
        attachmentUrls: [],
        resolvedAt: null,
        resolvedBy: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
            .overrideProvider(IncidentsService)
            .useValue(incidentsServiceMock)
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

    describe(`POST /v${majorVersion}/incidents`, () => {
        it("returns 201 when a user reports an incident", async () => {
            incidentsServiceMock.create.mockResolvedValue(fakeIncident);

            const payload = {
                title: "Broken streetlight",
                description: "The streetlight on Rue de Rivoli is broken",
                priority: "medium",
            };

            await request(app.getHttpServer())
                .post(`/v${majorVersion}/incidents`)
                .send(payload)
                .expect(201)
                .expect(({ body }) => {
                    expect(body).toEqual(fakeIncident);
                });

            expect(incidentsServiceMock.create).toHaveBeenCalledWith(
                fakeUser.id,
                payload,
            );
        });

        it("returns 401 when unauthenticated", async () => {
            jwtGuardCanActivateSpy.mockImplementation(() => {
                throw new UnauthorizedException("Unauthorized");
            });

            await request(app.getHttpServer())
                .post(`/v${majorVersion}/incidents`)
                .send({ title: "Test", description: "desc" })
                .expect(401);
        });
    });

    describe(`GET /v${majorVersion}/incidents`, () => {
        it("returns 200 with paginated incident list", async () => {
            const expected = {
                data: [fakeIncident],
                meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
            };

            incidentsServiceMock.findAll.mockResolvedValue(expected);

            await request(app.getHttpServer())
                .get(`/v${majorVersion}/incidents`)
                .expect(200)
                .expect(({ body }) => {
                    expect(body).toEqual(expected);
                });

            expect(incidentsServiceMock.findAll).toHaveBeenCalled();
        });

        it("returns 401 when unauthenticated", async () => {
            jwtGuardCanActivateSpy.mockImplementation(() => {
                throw new UnauthorizedException("Unauthorized");
            });

            await request(app.getHttpServer())
                .get(`/v${majorVersion}/incidents`)
                .expect(401);
        });
    });

    describe(`GET /v${majorVersion}/incidents/:id`, () => {
        it("returns 200 with incident details", async () => {
            incidentsServiceMock.findOne.mockResolvedValue(fakeIncident);

            await request(app.getHttpServer())
                .get(`/v${majorVersion}/incidents/${fakeIncidentId}`)
                .expect(200)
                .expect(({ body }) => {
                    expect(body).toEqual(fakeIncident);
                });

            expect(incidentsServiceMock.findOne).toHaveBeenCalledWith(
                fakeIncidentId,
            );
        });

        it("returns 404 when incident does not exist", async () => {
            incidentsServiceMock.findOne.mockRejectedValue(
                new NotFoundException("Incident not found"),
            );

            await request(app.getHttpServer())
                .get(`/v${majorVersion}/incidents/${fakeIncidentId}`)
                .expect(404);
        });

        it("returns 401 when unauthenticated", async () => {
            jwtGuardCanActivateSpy.mockImplementation(() => {
                throw new UnauthorizedException("Unauthorized");
            });

            await request(app.getHttpServer())
                .get(`/v${majorVersion}/incidents/${fakeIncidentId}`)
                .expect(401);
        });
    });

    describe(`PATCH /v${majorVersion}/incidents/:id`, () => {
        it("returns 200 when creator updates an incident", async () => {
            const updated = { ...fakeIncident, title: "Fixed streetlight" };
            incidentsServiceMock.update.mockResolvedValue(updated);

            await request(app.getHttpServer())
                .patch(`/v${majorVersion}/incidents/${fakeIncidentId}`)
                .send({ title: "Fixed streetlight" })
                .expect(200)
                .expect(({ body }) => {
                    expect(body.title).toBe("Fixed streetlight");
                });

            expect(incidentsServiceMock.update).toHaveBeenCalledWith(
                fakeIncidentId,
                fakeUser.id,
                fakeUser.role,
                { title: "Fixed streetlight" },
            );
        });

        it("returns 403 when non-creator and non-admin tries to update", async () => {
            incidentsServiceMock.update.mockRejectedValue(
                new ForbiddenException(
                    "You do not have permission to update this incident",
                ),
            );

            await request(app.getHttpServer())
                .patch(`/v${majorVersion}/incidents/${fakeIncidentId}`)
                .send({ title: "Unauthorized update" })
                .expect(403);
        });

        it("returns 404 when incident does not exist", async () => {
            incidentsServiceMock.update.mockRejectedValue(
                new NotFoundException("Incident not found"),
            );

            await request(app.getHttpServer())
                .patch(`/v${majorVersion}/incidents/${fakeIncidentId}`)
                .send({ title: "Ghost" })
                .expect(404);
        });

        it("returns 401 when unauthenticated", async () => {
            jwtGuardCanActivateSpy.mockImplementation(() => {
                throw new UnauthorizedException("Unauthorized");
            });

            await request(app.getHttpServer())
                .patch(`/v${majorVersion}/incidents/${fakeIncidentId}`)
                .send({ title: "No auth" })
                .expect(401);
        });
    });

    describe(`DELETE /v${majorVersion}/incidents/:id`, () => {
        it("returns 200 when admin deletes an incident", async () => {
            jwtGuardCanActivateSpy.mockImplementation(
                (ctx: ExecutionContext) => {
                    const req = ctx
                        .switchToHttp()
                        .getRequest<{ user: typeof fakeAdminUser }>();
                    req.user = fakeAdminUser;
                    return true;
                },
            );

            incidentsServiceMock.delete.mockResolvedValue(undefined);

            await request(app.getHttpServer())
                .delete(`/v${majorVersion}/incidents/${fakeIncidentId}`)
                .expect(200);

            expect(incidentsServiceMock.delete).toHaveBeenCalledWith(
                fakeIncidentId,
                fakeAdminUser.role,
            );
        });

        it("returns 403 when non-admin tries to delete", async () => {
            await request(app.getHttpServer())
                .delete(`/v${majorVersion}/incidents/${fakeIncidentId}`)
                .expect(403);
        });

        it("returns 404 when incident does not exist", async () => {
            jwtGuardCanActivateSpy.mockImplementation(
                (ctx: ExecutionContext) => {
                    const req = ctx
                        .switchToHttp()
                        .getRequest<{ user: typeof fakeAdminUser }>();
                    req.user = fakeAdminUser;
                    return true;
                },
            );

            incidentsServiceMock.delete.mockRejectedValue(
                new NotFoundException("Incident not found"),
            );

            await request(app.getHttpServer())
                .delete(`/v${majorVersion}/incidents/${fakeIncidentId}`)
                .expect(404);
        });

        it("returns 401 when unauthenticated", async () => {
            jwtGuardCanActivateSpy.mockImplementation(() => {
                throw new UnauthorizedException("Unauthorized");
            });

            await request(app.getHttpServer())
                .delete(`/v${majorVersion}/incidents/${fakeIncidentId}`)
                .expect(401);
        });
    });

    describe(`POST /v${majorVersion}/incidents/:id/comments`, () => {
        it("returns 201 when user adds a comment", async () => {
            const fakeComment = {
                id: "d1e2f3a4-b5c6-7890-def0-123456789012",
                incidentId: fakeIncidentId,
                authorId: fakeUser.id,
                content: "I noticed this too!",
                createdAt: new Date().toISOString(),
            };

            incidentsServiceMock.addComment.mockResolvedValue(fakeComment);

            const payload = { content: "I noticed this too!" };

            await request(app.getHttpServer())
                .post(`/v${majorVersion}/incidents/${fakeIncidentId}/comments`)
                .send(payload)
                .expect(201)
                .expect(({ body }) => {
                    expect(body).toEqual(fakeComment);
                });

            expect(incidentsServiceMock.addComment).toHaveBeenCalledWith(
                fakeIncidentId,
                fakeUser.id,
                payload,
            );
        });

        it("returns 404 when incident does not exist", async () => {
            incidentsServiceMock.addComment.mockRejectedValue(
                new NotFoundException("Incident not found"),
            );

            await request(app.getHttpServer())
                .post(`/v${majorVersion}/incidents/${fakeIncidentId}/comments`)
                .send({ content: "Ghost comment" })
                .expect(404);
        });

        it("returns 401 when unauthenticated", async () => {
            jwtGuardCanActivateSpy.mockImplementation(() => {
                throw new UnauthorizedException("Unauthorized");
            });

            await request(app.getHttpServer())
                .post(`/v${majorVersion}/incidents/${fakeIncidentId}/comments`)
                .send({ content: "No auth" })
                .expect(401);
        });
    });

    describe(`GET /v${majorVersion}/incidents/:id/comments`, () => {
        it("returns 200 with paginated comment list", async () => {
            const expected = {
                data: [
                    {
                        id: "comment-id",
                        incidentId: fakeIncidentId,
                        authorId: fakeUser.id,
                        content: "I saw this too",
                        createdAt: new Date().toISOString(),
                    },
                ],
                meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
            };

            incidentsServiceMock.getComments.mockResolvedValue(expected);

            await request(app.getHttpServer())
                .get(`/v${majorVersion}/incidents/${fakeIncidentId}/comments`)
                .expect(200)
                .expect(({ body }) => {
                    expect(body).toEqual(expected);
                });

            expect(incidentsServiceMock.getComments).toHaveBeenCalled();
        });

        it("returns 401 when unauthenticated", async () => {
            jwtGuardCanActivateSpy.mockImplementation(() => {
                throw new UnauthorizedException("Unauthorized");
            });

            await request(app.getHttpServer())
                .get(`/v${majorVersion}/incidents/${fakeIncidentId}/comments`)
                .expect(401);
        });
    });
});
