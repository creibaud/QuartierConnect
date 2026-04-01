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
import { TransactionsService } from "../src/modules/transactions/transactions.service";

describe("TransactionsController (e2e)", () => {
    let app: INestApplication<App>;
    let jwtGuardCanActivateSpy: jest.SpyInstance;

    const majorVersion = packageJson.version.split(".")[0];

    const fakeUser = {
        id: "6fce8b71-2d1a-4d4a-9c12-44d4624e8f81",
        email: "john.doe@example.com",
        role: "resident",
    };

    const fakeAdminUser = {
        id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        email: "admin@example.com",
        role: "admin",
    };

    const transactionsServiceMock = {
        findMyHistory: jest.fn(),
        findAll: jest.fn(),
        findOne: jest.fn(),
        createAdjustment: jest.fn(),
    };

    const fakeTransactionId = "507f1f77bcf86cd799439011";

    const fakeTransaction = {
        id: fakeTransactionId,
        fromUserId: fakeUser.id,
        toUserId: "other-user-id",
        type: "service_exchange",
        pointsAmount: 1,
        description: "Payment for service: Help with groceries",
        createdAt: new Date().toISOString(),
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
            .overrideProvider(TransactionsService)
            .useValue(transactionsServiceMock)
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

    it(`/v${majorVersion}/transactions/me (GET) returns 200`, async () => {
        const paginatedResult = {
            data: [fakeTransaction],
            total: 1,
            page: 1,
            limit: 10,
        };

        transactionsServiceMock.findMyHistory.mockResolvedValue(
            paginatedResult,
        );

        await request(app.getHttpServer())
            .get(`/v${majorVersion}/transactions/me`)
            .expect(200)
            .expect(({ body }) => {
                expect(body).toEqual(paginatedResult);
            });

        expect(transactionsServiceMock.findMyHistory).toHaveBeenCalledWith(
            fakeUser.id,
            expect.any(Object),
        );
    });

    it(`/v${majorVersion}/transactions/me (GET) returns 401 without auth`, async () => {
        jwtGuardCanActivateSpy.mockImplementation(() => {
            throw new UnauthorizedException("Unauthorized");
        });

        await request(app.getHttpServer())
            .get(`/v${majorVersion}/transactions/me`)
            .expect(401);
    });

    it(`/v${majorVersion}/transactions (GET) returns 200 for admin`, async () => {
        jwtGuardCanActivateSpy.mockImplementation((ctx: ExecutionContext) => {
            const req = ctx
                .switchToHttp()
                .getRequest<{ user: typeof fakeAdminUser }>();
            req.user = fakeAdminUser;
            return true;
        });

        const paginatedResult = {
            data: [fakeTransaction],
            total: 1,
            page: 1,
            limit: 10,
        };

        transactionsServiceMock.findAll.mockResolvedValue(paginatedResult);

        await request(app.getHttpServer())
            .get(`/v${majorVersion}/transactions`)
            .expect(200)
            .expect(({ body }) => {
                expect(body).toEqual(paginatedResult);
            });

        expect(transactionsServiceMock.findAll).toHaveBeenCalled();
    });

    it(`/v${majorVersion}/transactions (GET) returns 403 for non-admin`, async () => {
        await request(app.getHttpServer())
            .get(`/v${majorVersion}/transactions`)
            .expect(403);
    });

    it(`/v${majorVersion}/transactions (GET) returns 401 without auth`, async () => {
        jwtGuardCanActivateSpy.mockImplementation(() => {
            throw new UnauthorizedException("Unauthorized");
        });

        await request(app.getHttpServer())
            .get(`/v${majorVersion}/transactions`)
            .expect(401);
    });

    it(`/v${majorVersion}/transactions/:id (GET) returns 200`, async () => {
        transactionsServiceMock.findOne.mockResolvedValue(fakeTransaction);

        await request(app.getHttpServer())
            .get(`/v${majorVersion}/transactions/${fakeTransactionId}`)
            .expect(200)
            .expect(({ body }) => {
                expect(body).toEqual(fakeTransaction);
            });

        expect(transactionsServiceMock.findOne).toHaveBeenCalledWith(
            fakeTransactionId,
        );
    });

    it(`/v${majorVersion}/transactions/:id (GET) returns 404 when not found`, async () => {
        transactionsServiceMock.findOne.mockRejectedValue(
            new NotFoundException("Transaction not found"),
        );

        await request(app.getHttpServer())
            .get(`/v${majorVersion}/transactions/${fakeTransactionId}`)
            .expect(404);
    });

    it(`/v${majorVersion}/transactions/:id (GET) returns 401 without auth`, async () => {
        jwtGuardCanActivateSpy.mockImplementation(() => {
            throw new UnauthorizedException("Unauthorized");
        });

        await request(app.getHttpServer())
            .get(`/v${majorVersion}/transactions/${fakeTransactionId}`)
            .expect(401);
    });

    it(`/v${majorVersion}/transactions/adjustment (POST) returns 201 for admin`, async () => {
        jwtGuardCanActivateSpy.mockImplementation((ctx: ExecutionContext) => {
            const req = ctx
                .switchToHttp()
                .getRequest<{ user: typeof fakeAdminUser }>();
            req.user = fakeAdminUser;
            return true;
        });

        const adjustmentPayload = {
            userId: fakeUser.id,
            pointsAmount: 10,
            description: "Manual bonus adjustment",
        };

        const adjustmentResult = {
            fromUserId: fakeAdminUser.id,
            toUserId: fakeUser.id,
            type: "adjustment",
            pointsAmount: 10,
            description: "Manual bonus adjustment",
            createdAt: new Date().toISOString(),
        };

        transactionsServiceMock.createAdjustment.mockResolvedValue(
            adjustmentResult,
        );

        await request(app.getHttpServer())
            .post(`/v${majorVersion}/transactions/adjustment`)
            .send(adjustmentPayload)
            .expect(201)
            .expect(({ body }) => {
                expect(body).toEqual(adjustmentResult);
            });

        expect(transactionsServiceMock.createAdjustment).toHaveBeenCalledWith(
            fakeAdminUser.id,
            adjustmentPayload,
        );
    });

    it(`/v${majorVersion}/transactions/adjustment (POST) returns 403 for non-admin`, async () => {
        const adjustmentPayload = {
            userId: fakeUser.id,
            pointsAmount: 10,
            description: "Manual bonus adjustment",
        };

        await request(app.getHttpServer())
            .post(`/v${majorVersion}/transactions/adjustment`)
            .send(adjustmentPayload)
            .expect(403);
    });

    it(`/v${majorVersion}/transactions/adjustment (POST) returns 401 without auth`, async () => {
        jwtGuardCanActivateSpy.mockImplementation(() => {
            throw new UnauthorizedException("Unauthorized");
        });

        await request(app.getHttpServer())
            .post(`/v${majorVersion}/transactions/adjustment`)
            .send({})
            .expect(401);
    });
});
