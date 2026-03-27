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
import { RecommendationsService } from "../src/modules/recommendations/recommendations.service";

describe("RecommendationsController (e2e)", () => {
    let app: INestApplication<App>;
    let jwtGuardCanActivateSpy: jest.SpyInstance;

    const majorVersion = packageJson.version.split(".")[0];

    const recommendationsServiceMock = {
        getEventRecommendations: jest.fn(),
        getServiceRecommendations: jest.fn(),
        getNeighborRecommendations: jest.fn(),
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
            .overrideProvider(MailerService)
            .useValue({ sendMail: jest.fn() })
            .overrideProvider(RecommendationsService)
            .useValue(recommendationsServiceMock)
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

    it(`/v${majorVersion}/recommendations/events (GET) returns 200 with event recommendations`, async () => {
        const recommendations = [
            { eventId: "event-1", score: 10 },
            { eventId: "event-2", score: 8 },
        ];
        recommendationsServiceMock.getEventRecommendations.mockResolvedValue(
            recommendations,
        );

        await request(app.getHttpServer())
            .get(`/v${majorVersion}/recommendations/events`)
            .expect(200)
            .expect(({ body }) => {
                expect(body).toEqual(recommendations);
            });

        expect(
            recommendationsServiceMock.getEventRecommendations,
        ).toHaveBeenCalledWith(fakeUser.id);
    });

    it(`/v${majorVersion}/recommendations/events (GET) returns 401 without auth`, async () => {
        jwtGuardCanActivateSpy.mockImplementation(() => {
            throw new UnauthorizedException("Unauthorized");
        });

        await request(app.getHttpServer())
            .get(`/v${majorVersion}/recommendations/events`)
            .expect(401);
    });

    it(`/v${majorVersion}/recommendations/services (GET) returns 200 with service recommendations`, async () => {
        const recommendations = [
            { serviceId: "service-1", score: 5 },
            { serviceId: "service-2", score: 3 },
        ];
        recommendationsServiceMock.getServiceRecommendations.mockResolvedValue(
            recommendations,
        );

        await request(app.getHttpServer())
            .get(`/v${majorVersion}/recommendations/services`)
            .expect(200)
            .expect(({ body }) => {
                expect(body).toEqual(recommendations);
            });

        expect(
            recommendationsServiceMock.getServiceRecommendations,
        ).toHaveBeenCalledWith(fakeUser.id);
    });

    it(`/v${majorVersion}/recommendations/services (GET) returns 401 without auth`, async () => {
        jwtGuardCanActivateSpy.mockImplementation(() => {
            throw new UnauthorizedException("Unauthorized");
        });

        await request(app.getHttpServer())
            .get(`/v${majorVersion}/recommendations/services`)
            .expect(401);
    });

    it(`/v${majorVersion}/recommendations/neighbors (GET) returns 200 with neighbor recommendations`, async () => {
        const recommendations = [
            {
                userId: "neighbor-1",
                firstName: "Alice",
                lastName: "Smith",
                weight: 0.9,
            },
            {
                userId: "neighbor-2",
                firstName: "Bob",
                lastName: "Jones",
                weight: 0.7,
            },
        ];
        recommendationsServiceMock.getNeighborRecommendations.mockResolvedValue(
            recommendations,
        );

        await request(app.getHttpServer())
            .get(`/v${majorVersion}/recommendations/neighbors`)
            .expect(200)
            .expect(({ body }) => {
                expect(body).toEqual(recommendations);
            });

        expect(
            recommendationsServiceMock.getNeighborRecommendations,
        ).toHaveBeenCalledWith(fakeUser.id);
    });

    it(`/v${majorVersion}/recommendations/neighbors (GET) returns 401 without auth`, async () => {
        jwtGuardCanActivateSpy.mockImplementation(() => {
            throw new UnauthorizedException("Unauthorized");
        });

        await request(app.getHttpServer())
            .get(`/v${majorVersion}/recommendations/neighbors`)
            .expect(401);
    });
});
