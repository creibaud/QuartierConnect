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
import { EventsService } from "../src/modules/events/events.service";

describe("EventsController (e2e)", () => {
    let app: INestApplication<App>;
    let jwtGuardCanActivateSpy: jest.SpyInstance;

    const majorVersion = packageJson.version.split(".")[0];

    const eventsServiceMock = {
        create: jest.fn(),
        findAll: jest.fn(),
        findOne: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        register: jest.fn(),
        cancelRegistration: jest.fn(),
        getRegistrations: jest.fn(),
        swipe: jest.fn(),
        getNextSwipe: jest.fn(),
    };

    const fakeUser = {
        id: "6fce8b71-2d1a-4d4a-9c12-44d4624e8f81",
        email: "john.doe@example.com",
        role: "resident",
    };

    const fakeEventId = "507f1f77bcf86cd799439011";

    const fakeEvent = {
        id: fakeEventId,
        quartierId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        creatorId: fakeUser.id,
        title: "Community Cleanup",
        description: "Let's clean the park together",
        category: "social",
        startDate: new Date("2026-04-01T10:00:00Z").toISOString(),
        location: { type: "Point", coordinates: [2.35, 48.88] },
        locationName: "Parc Montmartre",
        maxCapacity: 50,
        registrationCount: 0,
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
            .useValue({ command: jest.fn().mockResolvedValue({}) })
            .overrideProvider("NEO4J")
            .useValue({
                verifyConnectivity: jest.fn().mockResolvedValue(undefined),
            })
            .overrideProvider(MailerService)
            .useValue({ sendMail: jest.fn() })
            .overrideProvider(EventsService)
            .useValue(eventsServiceMock)
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

    describe(`POST /v${majorVersion}/events`, () => {
        it("returns 201 when a user creates an event", async () => {
            eventsServiceMock.create.mockResolvedValue(fakeEvent);

            const payload = {
                quartierId: fakeEvent.quartierId,
                title: "Community Cleanup",
                description: "Let's clean the park together",
                category: "social",
                startDate: "2026-04-01T10:00:00Z",
                location: { type: "Point", coordinates: [2.35, 48.88] },
                locationName: "Parc Montmartre",
                maxCapacity: 50,
            };

            await request(app.getHttpServer())
                .post(`/v${majorVersion}/events`)
                .send(payload)
                .expect(201);

            expect(eventsServiceMock.create).toHaveBeenCalledWith(
                fakeUser.id,
                payload,
            );
        });

        it("returns 401 when unauthenticated", async () => {
            jwtGuardCanActivateSpy.mockImplementation(() => {
                throw new UnauthorizedException("Unauthorized");
            });

            await request(app.getHttpServer())
                .post(`/v${majorVersion}/events`)
                .send({ title: "Test" })
                .expect(401);
        });
    });

    describe(`GET /v${majorVersion}/events`, () => {
        it("returns 200 with paginated list of events", async () => {
            const expected = {
                data: [fakeEvent],
                meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
            };

            eventsServiceMock.findAll.mockResolvedValue(expected);

            await request(app.getHttpServer())
                .get(`/v${majorVersion}/events`)
                .expect(200)
                .expect(({ body }) => {
                    expect(body).toEqual(expected);
                });

            expect(eventsServiceMock.findAll).toHaveBeenCalled();
        });

        it("returns 401 when unauthenticated", async () => {
            jwtGuardCanActivateSpy.mockImplementation(() => {
                throw new UnauthorizedException("Unauthorized");
            });

            await request(app.getHttpServer())
                .get(`/v${majorVersion}/events`)
                .expect(401);
        });
    });

    describe(`GET /v${majorVersion}/events/swipe-next`, () => {
        it("returns 200 with next event to swipe", async () => {
            eventsServiceMock.getNextSwipe.mockResolvedValue(fakeEvent);

            await request(app.getHttpServer())
                .get(`/v${majorVersion}/events/swipe-next`)
                .query({ quartierId: fakeEvent.quartierId })
                .expect(200)
                .expect(({ body }) => {
                    expect(body).toEqual(fakeEvent);
                });

            expect(eventsServiceMock.getNextSwipe).toHaveBeenCalledWith(
                fakeUser.id,
                fakeEvent.quartierId,
            );
        });

        it("returns 200 with empty body when no events left to swipe", async () => {
            eventsServiceMock.getNextSwipe.mockResolvedValue(null);

            await request(app.getHttpServer())
                .get(`/v${majorVersion}/events/swipe-next`)
                .query({ quartierId: fakeEvent.quartierId })
                .expect(200);
        });

        it("returns 401 when unauthenticated", async () => {
            jwtGuardCanActivateSpy.mockImplementation(() => {
                throw new UnauthorizedException("Unauthorized");
            });

            await request(app.getHttpServer())
                .get(`/v${majorVersion}/events/swipe-next`)
                .expect(401);
        });
    });

    describe(`GET /v${majorVersion}/events/:id`, () => {
        it("returns 200 with event details", async () => {
            eventsServiceMock.findOne.mockResolvedValue(fakeEvent);

            await request(app.getHttpServer())
                .get(`/v${majorVersion}/events/${fakeEventId}`)
                .expect(200)
                .expect(({ body }) => {
                    expect(body).toEqual(fakeEvent);
                });

            expect(eventsServiceMock.findOne).toHaveBeenCalledWith(fakeEventId);
        });

        it("returns 404 when event does not exist", async () => {
            eventsServiceMock.findOne.mockRejectedValue(
                new NotFoundException("Event not found"),
            );

            await request(app.getHttpServer())
                .get(`/v${majorVersion}/events/${fakeEventId}`)
                .expect(404);
        });

        it("returns 401 when unauthenticated", async () => {
            jwtGuardCanActivateSpy.mockImplementation(() => {
                throw new UnauthorizedException("Unauthorized");
            });

            await request(app.getHttpServer())
                .get(`/v${majorVersion}/events/${fakeEventId}`)
                .expect(401);
        });
    });

    describe(`PATCH /v${majorVersion}/events/:id`, () => {
        it("returns 200 when creator updates an event", async () => {
            const updated = { ...fakeEvent, title: "Updated Cleanup" };
            eventsServiceMock.update.mockResolvedValue(updated);

            await request(app.getHttpServer())
                .patch(`/v${majorVersion}/events/${fakeEventId}`)
                .send({ title: "Updated Cleanup" })
                .expect(200)
                .expect(({ body }: { body: { title: string } }) => {
                    expect(body.title).toBe("Updated Cleanup");
                });

            expect(eventsServiceMock.update).toHaveBeenCalledWith(
                fakeEventId,
                fakeUser.id,
                fakeUser.role,
                { title: "Updated Cleanup" },
            );
        });

        it("returns 403 when non-creator tries to update", async () => {
            eventsServiceMock.update.mockRejectedValue(
                new ForbiddenException(
                    "You are not allowed to update this event",
                ),
            );

            await request(app.getHttpServer())
                .patch(`/v${majorVersion}/events/${fakeEventId}`)
                .send({ title: "Hijacked" })
                .expect(403);
        });

        it("returns 404 when event does not exist", async () => {
            eventsServiceMock.update.mockRejectedValue(
                new NotFoundException("Event not found"),
            );

            await request(app.getHttpServer())
                .patch(`/v${majorVersion}/events/${fakeEventId}`)
                .send({ title: "Ghost" })
                .expect(404);
        });

        it("returns 401 when unauthenticated", async () => {
            jwtGuardCanActivateSpy.mockImplementation(() => {
                throw new UnauthorizedException("Unauthorized");
            });

            await request(app.getHttpServer())
                .patch(`/v${majorVersion}/events/${fakeEventId}`)
                .send({ title: "No auth" })
                .expect(401);
        });
    });

    describe(`DELETE /v${majorVersion}/events/:id`, () => {
        it("returns 204 when creator deletes an event", async () => {
            eventsServiceMock.delete.mockResolvedValue(undefined);

            await request(app.getHttpServer())
                .delete(`/v${majorVersion}/events/${fakeEventId}`)
                .expect(204);

            expect(eventsServiceMock.delete).toHaveBeenCalledWith(
                fakeEventId,
                fakeUser.id,
                fakeUser.role,
            );
        });

        it("returns 403 when non-creator tries to delete", async () => {
            eventsServiceMock.delete.mockRejectedValue(
                new ForbiddenException(
                    "You are not allowed to delete this event",
                ),
            );

            await request(app.getHttpServer())
                .delete(`/v${majorVersion}/events/${fakeEventId}`)
                .expect(403);
        });

        it("returns 404 when event does not exist", async () => {
            eventsServiceMock.delete.mockRejectedValue(
                new NotFoundException("Event not found"),
            );

            await request(app.getHttpServer())
                .delete(`/v${majorVersion}/events/${fakeEventId}`)
                .expect(404);
        });

        it("returns 401 when unauthenticated", async () => {
            jwtGuardCanActivateSpy.mockImplementation(() => {
                throw new UnauthorizedException("Unauthorized");
            });

            await request(app.getHttpServer())
                .delete(`/v${majorVersion}/events/${fakeEventId}`)
                .expect(401);
        });
    });

    describe(`POST /v${majorVersion}/events/:id/register`, () => {
        it("returns 201 when user registers for an event", async () => {
            eventsServiceMock.register.mockResolvedValue(undefined);

            await request(app.getHttpServer())
                .post(`/v${majorVersion}/events/${fakeEventId}/register`)
                .expect(201);

            expect(eventsServiceMock.register).toHaveBeenCalledWith(
                fakeEventId,
                fakeUser.id,
            );
        });

        it("returns 404 when event does not exist", async () => {
            eventsServiceMock.register.mockRejectedValue(
                new NotFoundException("Event not found"),
            );

            await request(app.getHttpServer())
                .post(`/v${majorVersion}/events/${fakeEventId}/register`)
                .expect(404);
        });

        it("returns 401 when unauthenticated", async () => {
            jwtGuardCanActivateSpy.mockImplementation(() => {
                throw new UnauthorizedException("Unauthorized");
            });

            await request(app.getHttpServer())
                .post(`/v${majorVersion}/events/${fakeEventId}/register`)
                .expect(401);
        });
    });

    describe(`DELETE /v${majorVersion}/events/:id/register`, () => {
        it("returns 204 when user cancels registration", async () => {
            eventsServiceMock.cancelRegistration.mockResolvedValue(undefined);

            await request(app.getHttpServer())
                .delete(`/v${majorVersion}/events/${fakeEventId}/register`)
                .expect(204);

            expect(eventsServiceMock.cancelRegistration).toHaveBeenCalledWith(
                fakeEventId,
                fakeUser.id,
            );
        });

        it("returns 401 when unauthenticated", async () => {
            jwtGuardCanActivateSpy.mockImplementation(() => {
                throw new UnauthorizedException("Unauthorized");
            });

            await request(app.getHttpServer())
                .delete(`/v${majorVersion}/events/${fakeEventId}/register`)
                .expect(401);
        });
    });

    describe(`GET /v${majorVersion}/events/:id/registrations`, () => {
        it("returns 200 with paginated registrations", async () => {
            const expected = {
                data: [
                    {
                        id: "reg-id",
                        eventId: fakeEventId,
                        userId: fakeUser.id,
                        status: "registered",
                        registeredAt: new Date().toISOString(),
                    },
                ],
                meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
            };

            eventsServiceMock.getRegistrations.mockResolvedValue(expected);

            await request(app.getHttpServer())
                .get(`/v${majorVersion}/events/${fakeEventId}/registrations`)
                .expect(200)
                .expect(({ body }) => {
                    expect(body).toEqual(expected);
                });

            expect(eventsServiceMock.getRegistrations).toHaveBeenCalled();
        });

        it("returns 401 when unauthenticated", async () => {
            jwtGuardCanActivateSpy.mockImplementation(() => {
                throw new UnauthorizedException("Unauthorized");
            });

            await request(app.getHttpServer())
                .get(`/v${majorVersion}/events/${fakeEventId}/registrations`)
                .expect(401);
        });
    });

    describe(`POST /v${majorVersion}/events/swipe`, () => {
        it("returns 201 when user swipes on an event", async () => {
            eventsServiceMock.swipe.mockResolvedValue(undefined);

            const payload = { eventId: fakeEventId, liked: true };

            await request(app.getHttpServer())
                .post(`/v${majorVersion}/events/swipe`)
                .send(payload)
                .expect(201);

            expect(eventsServiceMock.swipe).toHaveBeenCalledWith(
                fakeUser.id,
                payload,
            );
        });

        it("returns 401 when unauthenticated", async () => {
            jwtGuardCanActivateSpy.mockImplementation(() => {
                throw new UnauthorizedException("Unauthorized");
            });

            await request(app.getHttpServer())
                .post(`/v${majorVersion}/events/swipe`)
                .send({ eventId: fakeEventId, liked: false })
                .expect(401);
        });
    });
});
