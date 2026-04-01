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
import { ServicesService } from "../src/modules/services/services.service";

describe("ServicesController (e2e)", () => {
    let app: INestApplication<App>;
    let jwtGuardCanActivateSpy: jest.SpyInstance;

    const majorVersion = packageJson.version.split(".")[0];

    const fakeUser = {
        id: "6fce8b71-2d1a-4d4a-9c12-44d4624e8f81",
        email: "john.doe@example.com",
        role: "resident",
    };

    const servicesServiceMock = {
        create: jest.fn(),
        findAll: jest.fn(),
        findMine: jest.fn(),
        findOne: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        accept: jest.fn(),
        complete: jest.fn(),
        cancel: jest.fn(),
        rate: jest.fn(),
        getContract: jest.fn(),
    };

    const fakeServiceId = "507f1f77bcf86cd799439011";

    const fakeService = {
        id: fakeServiceId,
        quartierId: "quartier-1",
        creatorId: fakeUser.id,
        title: "Help with groceries",
        description: "I need help carrying groceries",
        category: "help",
        type: "free",
        estimatedDurationMinutes: 30,
        pointsValue: 1,
        status: "open",
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
            .overrideProvider(ServicesService)
            .useValue(servicesServiceMock)
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

    it(`/v${majorVersion}/services (POST) returns 201`, async () => {
        const payload = {
            quartierId: "quartier-1",
            title: "Help with groceries",
            description: "I need help carrying groceries",
            category: "help",
            type: "free",
            estimatedDurationMinutes: 30,
        };

        servicesServiceMock.create.mockResolvedValue(fakeService);

        await request(app.getHttpServer())
            .post(`/v${majorVersion}/services`)
            .send(payload)
            .expect(201)
            .expect(({ body }) => {
                expect(body).toEqual(fakeService);
            });

        expect(servicesServiceMock.create).toHaveBeenCalledWith(
            fakeUser.id,
            payload,
        );
    });

    it(`/v${majorVersion}/services (POST) returns 401 without auth`, async () => {
        jwtGuardCanActivateSpy.mockImplementation(() => {
            throw new UnauthorizedException("Unauthorized");
        });

        await request(app.getHttpServer())
            .post(`/v${majorVersion}/services`)
            .send({})
            .expect(401);
    });

    it(`/v${majorVersion}/services (GET) returns 200`, async () => {
        const paginatedResult = {
            data: [fakeService],
            total: 1,
            page: 1,
            limit: 10,
        };

        servicesServiceMock.findAll.mockResolvedValue(paginatedResult);

        await request(app.getHttpServer())
            .get(`/v${majorVersion}/services`)
            .expect(200)
            .expect(({ body }) => {
                expect(body).toEqual(paginatedResult);
            });

        expect(servicesServiceMock.findAll).toHaveBeenCalled();
    });

    it(`/v${majorVersion}/services/me (GET) returns 200`, async () => {
        const paginatedResult = {
            data: [fakeService],
            total: 1,
            page: 1,
            limit: 10,
        };

        servicesServiceMock.findMine.mockResolvedValue(paginatedResult);

        await request(app.getHttpServer())
            .get(`/v${majorVersion}/services/me`)
            .expect(200)
            .expect(({ body }) => {
                expect(body).toEqual(paginatedResult);
            });

        expect(servicesServiceMock.findMine).toHaveBeenCalledWith(
            fakeUser.id,
            expect.any(Object),
        );
    });

    it(`/v${majorVersion}/services/me (GET) returns 401 without auth`, async () => {
        jwtGuardCanActivateSpy.mockImplementation(() => {
            throw new UnauthorizedException("Unauthorized");
        });

        await request(app.getHttpServer())
            .get(`/v${majorVersion}/services/me`)
            .expect(401);
    });

    it(`/v${majorVersion}/services/:id (GET) returns 200`, async () => {
        servicesServiceMock.findOne.mockResolvedValue(fakeService);

        await request(app.getHttpServer())
            .get(`/v${majorVersion}/services/${fakeServiceId}`)
            .expect(200)
            .expect(({ body }) => {
                expect(body).toEqual(fakeService);
            });

        expect(servicesServiceMock.findOne).toHaveBeenCalledWith(fakeServiceId);
    });

    it(`/v${majorVersion}/services/:id (GET) returns 404 when not found`, async () => {
        servicesServiceMock.findOne.mockRejectedValue(
            new NotFoundException("Service not found"),
        );

        await request(app.getHttpServer())
            .get(`/v${majorVersion}/services/${fakeServiceId}`)
            .expect(404);
    });

    it(`/v${majorVersion}/services/:id (PATCH) returns 200`, async () => {
        const updatePayload = { title: "Updated title" };
        const updatedService = { ...fakeService, ...updatePayload };

        servicesServiceMock.update.mockResolvedValue(updatedService);

        await request(app.getHttpServer())
            .patch(`/v${majorVersion}/services/${fakeServiceId}`)
            .send(updatePayload)
            .expect(200)
            .expect(({ body }) => {
                expect(body).toEqual(updatedService);
            });

        expect(servicesServiceMock.update).toHaveBeenCalledWith(
            fakeServiceId,
            fakeUser.id,
            updatePayload,
        );
    });

    it(`/v${majorVersion}/services/:id (PATCH) returns 401 without auth`, async () => {
        jwtGuardCanActivateSpy.mockImplementation(() => {
            throw new UnauthorizedException("Unauthorized");
        });

        await request(app.getHttpServer())
            .patch(`/v${majorVersion}/services/${fakeServiceId}`)
            .send({ title: "Updated" })
            .expect(401);
    });

    it(`/v${majorVersion}/services/:id (PATCH) returns 403 when not creator`, async () => {
        servicesServiceMock.update.mockRejectedValue(
            new ForbiddenException("Only the creator can update this service"),
        );

        await request(app.getHttpServer())
            .patch(`/v${majorVersion}/services/${fakeServiceId}`)
            .send({ title: "Updated" })
            .expect(403);
    });

    it(`/v${majorVersion}/services/:id (PATCH) returns 404 when not found`, async () => {
        servicesServiceMock.update.mockRejectedValue(
            new NotFoundException("Service not found"),
        );

        await request(app.getHttpServer())
            .patch(`/v${majorVersion}/services/${fakeServiceId}`)
            .send({ title: "Updated" })
            .expect(404);
    });

    it(`/v${majorVersion}/services/:id (DELETE) returns 204`, async () => {
        servicesServiceMock.delete.mockResolvedValue(undefined);

        await request(app.getHttpServer())
            .delete(`/v${majorVersion}/services/${fakeServiceId}`)
            .expect(204);

        expect(servicesServiceMock.delete).toHaveBeenCalledWith(
            fakeServiceId,
            fakeUser.id,
        );
    });

    it(`/v${majorVersion}/services/:id (DELETE) returns 401 without auth`, async () => {
        jwtGuardCanActivateSpy.mockImplementation(() => {
            throw new UnauthorizedException("Unauthorized");
        });

        await request(app.getHttpServer())
            .delete(`/v${majorVersion}/services/${fakeServiceId}`)
            .expect(401);
    });

    it(`/v${majorVersion}/services/:id (DELETE) returns 403 when not creator`, async () => {
        servicesServiceMock.delete.mockRejectedValue(
            new ForbiddenException("Only the creator can delete this service"),
        );

        await request(app.getHttpServer())
            .delete(`/v${majorVersion}/services/${fakeServiceId}`)
            .expect(403);
    });

    it(`/v${majorVersion}/services/:id (DELETE) returns 404 when not found`, async () => {
        servicesServiceMock.delete.mockRejectedValue(
            new NotFoundException("Service not found"),
        );

        await request(app.getHttpServer())
            .delete(`/v${majorVersion}/services/${fakeServiceId}`)
            .expect(404);
    });

    it(`/v${majorVersion}/services/:id/accept (POST) returns 200`, async () => {
        const acceptedService = { ...fakeService, status: "accepted" };

        servicesServiceMock.accept.mockResolvedValue(acceptedService);

        await request(app.getHttpServer())
            .post(`/v${majorVersion}/services/${fakeServiceId}/accept`)
            .expect(200)
            .expect(({ body }) => {
                expect(body).toEqual(acceptedService);
            });

        expect(servicesServiceMock.accept).toHaveBeenCalledWith(
            fakeServiceId,
            fakeUser.id,
        );
    });

    it(`/v${majorVersion}/services/:id/accept (POST) returns 401 without auth`, async () => {
        jwtGuardCanActivateSpy.mockImplementation(() => {
            throw new UnauthorizedException("Unauthorized");
        });

        await request(app.getHttpServer())
            .post(`/v${majorVersion}/services/${fakeServiceId}/accept`)
            .expect(401);
    });

    it(`/v${majorVersion}/services/:id/accept (POST) returns 404 when not found`, async () => {
        servicesServiceMock.accept.mockRejectedValue(
            new NotFoundException("Service not found"),
        );

        await request(app.getHttpServer())
            .post(`/v${majorVersion}/services/${fakeServiceId}/accept`)
            .expect(404);
    });

    it(`/v${majorVersion}/services/:id/complete (POST) returns 200`, async () => {
        const completedService = { ...fakeService, status: "completed" };

        servicesServiceMock.complete.mockResolvedValue(completedService);

        await request(app.getHttpServer())
            .post(`/v${majorVersion}/services/${fakeServiceId}/complete`)
            .expect(200)
            .expect(({ body }) => {
                expect(body).toEqual(completedService);
            });

        expect(servicesServiceMock.complete).toHaveBeenCalledWith(
            fakeServiceId,
            fakeUser.id,
        );
    });

    it(`/v${majorVersion}/services/:id/complete (POST) returns 401 without auth`, async () => {
        jwtGuardCanActivateSpy.mockImplementation(() => {
            throw new UnauthorizedException("Unauthorized");
        });

        await request(app.getHttpServer())
            .post(`/v${majorVersion}/services/${fakeServiceId}/complete`)
            .expect(401);
    });

    it(`/v${majorVersion}/services/:id/complete (POST) returns 403 when not creator or acceptor`, async () => {
        servicesServiceMock.complete.mockRejectedValue(
            new ForbiddenException(
                "Only the creator or acceptor can complete this service",
            ),
        );

        await request(app.getHttpServer())
            .post(`/v${majorVersion}/services/${fakeServiceId}/complete`)
            .expect(403);
    });

    it(`/v${majorVersion}/services/:id/complete (POST) returns 404 when not found`, async () => {
        servicesServiceMock.complete.mockRejectedValue(
            new NotFoundException("Service not found"),
        );

        await request(app.getHttpServer())
            .post(`/v${majorVersion}/services/${fakeServiceId}/complete`)
            .expect(404);
    });

    it(`/v${majorVersion}/services/:id/cancel (POST) returns 200`, async () => {
        const cancelledService = { ...fakeService, status: "cancelled" };

        servicesServiceMock.cancel.mockResolvedValue(cancelledService);

        await request(app.getHttpServer())
            .post(`/v${majorVersion}/services/${fakeServiceId}/cancel`)
            .expect(200)
            .expect(({ body }) => {
                expect(body).toEqual(cancelledService);
            });

        expect(servicesServiceMock.cancel).toHaveBeenCalledWith(
            fakeServiceId,
            fakeUser.id,
        );
    });

    it(`/v${majorVersion}/services/:id/cancel (POST) returns 401 without auth`, async () => {
        jwtGuardCanActivateSpy.mockImplementation(() => {
            throw new UnauthorizedException("Unauthorized");
        });

        await request(app.getHttpServer())
            .post(`/v${majorVersion}/services/${fakeServiceId}/cancel`)
            .expect(401);
    });

    it(`/v${majorVersion}/services/:id/cancel (POST) returns 403 when not creator or acceptor`, async () => {
        servicesServiceMock.cancel.mockRejectedValue(
            new ForbiddenException(
                "Only the creator or acceptor can cancel this service",
            ),
        );

        await request(app.getHttpServer())
            .post(`/v${majorVersion}/services/${fakeServiceId}/cancel`)
            .expect(403);
    });

    it(`/v${majorVersion}/services/:id/cancel (POST) returns 404 when not found`, async () => {
        servicesServiceMock.cancel.mockRejectedValue(
            new NotFoundException("Service not found"),
        );

        await request(app.getHttpServer())
            .post(`/v${majorVersion}/services/${fakeServiceId}/cancel`)
            .expect(404);
    });

    it(`/v${majorVersion}/services/:id/rate (POST) returns 201`, async () => {
        const ratePayload = { rating: 5, comment: "Great service!" };
        const ratingResult = {
            serviceId: fakeServiceId,
            raterUserId: fakeUser.id,
            rating: 5,
            comment: "Great service!",
            createdAt: new Date().toISOString(),
        };

        servicesServiceMock.rate.mockResolvedValue(ratingResult);

        await request(app.getHttpServer())
            .post(`/v${majorVersion}/services/${fakeServiceId}/rate`)
            .send(ratePayload)
            .expect(201)
            .expect(({ body }) => {
                expect(body).toEqual(ratingResult);
            });

        expect(servicesServiceMock.rate).toHaveBeenCalledWith(
            fakeServiceId,
            fakeUser.id,
            ratePayload,
        );
    });

    it(`/v${majorVersion}/services/:id/rate (POST) returns 401 without auth`, async () => {
        jwtGuardCanActivateSpy.mockImplementation(() => {
            throw new UnauthorizedException("Unauthorized");
        });

        await request(app.getHttpServer())
            .post(`/v${majorVersion}/services/${fakeServiceId}/rate`)
            .send({ rating: 5 })
            .expect(401);
    });

    it(`/v${majorVersion}/services/:id/rate (POST) returns 403 when not creator or acceptor`, async () => {
        servicesServiceMock.rate.mockRejectedValue(
            new ForbiddenException(
                "Only the creator or acceptor can rate this service",
            ),
        );

        await request(app.getHttpServer())
            .post(`/v${majorVersion}/services/${fakeServiceId}/rate`)
            .send({ rating: 5 })
            .expect(403);
    });

    it(`/v${majorVersion}/services/:id/rate (POST) returns 404 when not found`, async () => {
        servicesServiceMock.rate.mockRejectedValue(
            new NotFoundException("Service not found"),
        );

        await request(app.getHttpServer())
            .post(`/v${majorVersion}/services/${fakeServiceId}/rate`)
            .send({ rating: 5 })
            .expect(404);
    });
});
