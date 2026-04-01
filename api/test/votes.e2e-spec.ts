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
import { VotesService } from "../src/modules/votes/votes.service";

describe("VotesController (e2e)", () => {
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

    const votesServiceMock = {
        create: jest.fn(),
        findAll: jest.fn(),
        findOne: jest.fn(),
        respond: jest.fn(),
        getResults: jest.fn(),
        close: jest.fn(),
        delete: jest.fn(),
    };

    const fakeVoteId = "507f1f77bcf86cd799439011";

    const fakeVote = {
        id: fakeVoteId,
        quartierId: "quartier-1",
        creatorId: fakeUser.id,
        title: "Should we organize a block party?",
        description: "Vote on whether to hold a neighborhood block party",
        type: "binary",
        options: [
            { id: "opt-1", label: "yes", votesCount: 0 },
            { id: "opt-2", label: "no", votesCount: 0 },
        ],
        durationMinutes: 1440,
        isAnonymous: false,
        showResults: true,
        startedAt: new Date().toISOString(),
        endsAt: new Date(Date.now() + 86400000).toISOString(),
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
            .useValue({ command: jest.fn().mockResolvedValue({}), collection: jest.fn().mockReturnValue({}) })
            .overrideProvider("NEO4J")
            .useValue({
                verifyConnectivity: jest.fn().mockResolvedValue(undefined),
            })
            .overrideProvider(MailerService)
            .useValue({ sendMail: jest.fn() })
            .overrideProvider(VotesService)
            .useValue(votesServiceMock)
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

    it(`/v${majorVersion}/votes (POST) returns 201`, async () => {
        const payload = {
            quartierId: "quartier-1",
            title: "Should we organize a block party?",
            description: "Vote on whether to hold a neighborhood block party",
            type: "binary",
            durationMinutes: 1440,
            isAnonymous: false,
            showResults: true,
        };

        votesServiceMock.create.mockResolvedValue(fakeVote);

        await request(app.getHttpServer())
            .post(`/v${majorVersion}/votes`)
            .send(payload)
            .expect(201)
            .expect(({ body }) => {
                expect(body).toEqual(fakeVote);
            });

        expect(votesServiceMock.create).toHaveBeenCalledWith(
            fakeUser.id,
            payload,
        );
    });

    it(`/v${majorVersion}/votes (POST) returns 401 without auth`, async () => {
        jwtGuardCanActivateSpy.mockImplementation(() => {
            throw new UnauthorizedException("Unauthorized");
        });

        await request(app.getHttpServer())
            .post(`/v${majorVersion}/votes`)
            .send({})
            .expect(401);
    });

    it(`/v${majorVersion}/votes (GET) returns 200`, async () => {
        const paginatedResult = {
            data: [fakeVote],
            total: 1,
            page: 1,
            limit: 10,
        };

        votesServiceMock.findAll.mockResolvedValue(paginatedResult);

        await request(app.getHttpServer())
            .get(`/v${majorVersion}/votes`)
            .query({ quartierId: "quartier-1" })
            .expect(200)
            .expect(({ body }) => {
                expect(body).toEqual(paginatedResult);
            });

        expect(votesServiceMock.findAll).toHaveBeenCalledWith(
            "quartier-1",
            expect.any(Object),
        );
    });

    it(`/v${majorVersion}/votes (GET) returns 401 without auth`, async () => {
        jwtGuardCanActivateSpy.mockImplementation(() => {
            throw new UnauthorizedException("Unauthorized");
        });

        await request(app.getHttpServer())
            .get(`/v${majorVersion}/votes`)
            .expect(401);
    });

    it(`/v${majorVersion}/votes/:id (GET) returns 200`, async () => {
        votesServiceMock.findOne.mockResolvedValue(fakeVote);

        await request(app.getHttpServer())
            .get(`/v${majorVersion}/votes/${fakeVoteId}`)
            .expect(200)
            .expect(({ body }) => {
                expect(body).toEqual(fakeVote);
            });

        expect(votesServiceMock.findOne).toHaveBeenCalledWith(fakeVoteId);
    });

    it(`/v${majorVersion}/votes/:id (GET) returns 404 when not found`, async () => {
        votesServiceMock.findOne.mockRejectedValue(
            new NotFoundException("Vote not found"),
        );

        await request(app.getHttpServer())
            .get(`/v${majorVersion}/votes/${fakeVoteId}`)
            .expect(404);
    });

    it(`/v${majorVersion}/votes/:id (GET) returns 401 without auth`, async () => {
        jwtGuardCanActivateSpy.mockImplementation(() => {
            throw new UnauthorizedException("Unauthorized");
        });

        await request(app.getHttpServer())
            .get(`/v${majorVersion}/votes/${fakeVoteId}`)
            .expect(401);
    });

    it(`/v${majorVersion}/votes/:id/respond (POST) returns 201`, async () => {
        const respondPayload = { selectedOptions: ["opt-1"] };
        const responseResult = {
            voteId: fakeVoteId,
            userId: fakeUser.id,
            selectedOptions: ["opt-1"],
            respondedAt: new Date().toISOString(),
        };

        votesServiceMock.respond.mockResolvedValue(responseResult);

        await request(app.getHttpServer())
            .post(`/v${majorVersion}/votes/${fakeVoteId}/respond`)
            .send(respondPayload)
            .expect(201)
            .expect(({ body }) => {
                expect(body).toEqual(responseResult);
            });

        expect(votesServiceMock.respond).toHaveBeenCalledWith(
            fakeVoteId,
            fakeUser.id,
            respondPayload,
        );
    });

    it(`/v${majorVersion}/votes/:id/respond (POST) returns 401 without auth`, async () => {
        jwtGuardCanActivateSpy.mockImplementation(() => {
            throw new UnauthorizedException("Unauthorized");
        });

        await request(app.getHttpServer())
            .post(`/v${majorVersion}/votes/${fakeVoteId}/respond`)
            .send({ selectedOptions: ["opt-1"] })
            .expect(401);
    });

    it(`/v${majorVersion}/votes/:id/respond (POST) returns 404 when vote not found`, async () => {
        votesServiceMock.respond.mockRejectedValue(
            new NotFoundException("Vote not found"),
        );

        await request(app.getHttpServer())
            .post(`/v${majorVersion}/votes/${fakeVoteId}/respond`)
            .send({ selectedOptions: ["opt-1"] })
            .expect(404);
    });

    it(`/v${majorVersion}/votes/:id/results (GET) returns 200`, async () => {
        const resultsData = {
            voteId: fakeVoteId,
            results: { yes: 5, no: 3 },
            participationCount: 8,
            endsAt: new Date(Date.now() + 86400000).toISOString(),
            isActive: true,
        };

        votesServiceMock.getResults.mockResolvedValue(resultsData);

        await request(app.getHttpServer())
            .get(`/v${majorVersion}/votes/${fakeVoteId}/results`)
            .expect(200)
            .expect(({ body }) => {
                expect(body).toEqual(resultsData);
            });

        expect(votesServiceMock.getResults).toHaveBeenCalledWith(
            fakeVoteId,
            fakeUser.id,
        );
    });

    it(`/v${majorVersion}/votes/:id/results (GET) returns 401 without auth`, async () => {
        jwtGuardCanActivateSpy.mockImplementation(() => {
            throw new UnauthorizedException("Unauthorized");
        });

        await request(app.getHttpServer())
            .get(`/v${majorVersion}/votes/${fakeVoteId}/results`)
            .expect(401);
    });

    it(`/v${majorVersion}/votes/:id/results (GET) returns 403 when results hidden`, async () => {
        votesServiceMock.getResults.mockRejectedValue(
            new ForbiddenException("Results are hidden until the vote ends"),
        );

        await request(app.getHttpServer())
            .get(`/v${majorVersion}/votes/${fakeVoteId}/results`)
            .expect(403);
    });

    it(`/v${majorVersion}/votes/:id/results (GET) returns 404 when not found`, async () => {
        votesServiceMock.getResults.mockRejectedValue(
            new NotFoundException("Vote not found"),
        );

        await request(app.getHttpServer())
            .get(`/v${majorVersion}/votes/${fakeVoteId}/results`)
            .expect(404);
    });

    it(`/v${majorVersion}/votes/:id/close (PATCH) returns 200`, async () => {
        const closedVote = {
            ...fakeVote,
            endsAt: new Date().toISOString(),
        };

        votesServiceMock.close.mockResolvedValue(closedVote);

        await request(app.getHttpServer())
            .patch(`/v${majorVersion}/votes/${fakeVoteId}/close`)
            .expect(200)
            .expect(({ body }) => {
                expect(body).toEqual(closedVote);
            });

        expect(votesServiceMock.close).toHaveBeenCalledWith(
            fakeVoteId,
            fakeUser.id,
        );
    });

    it(`/v${majorVersion}/votes/:id/close (PATCH) returns 401 without auth`, async () => {
        jwtGuardCanActivateSpy.mockImplementation(() => {
            throw new UnauthorizedException("Unauthorized");
        });

        await request(app.getHttpServer())
            .patch(`/v${majorVersion}/votes/${fakeVoteId}/close`)
            .expect(401);
    });

    it(`/v${majorVersion}/votes/:id/close (PATCH) returns 403 when not creator`, async () => {
        votesServiceMock.close.mockRejectedValue(
            new ForbiddenException("Only the creator can close this vote"),
        );

        await request(app.getHttpServer())
            .patch(`/v${majorVersion}/votes/${fakeVoteId}/close`)
            .expect(403);
    });

    it(`/v${majorVersion}/votes/:id/close (PATCH) returns 404 when not found`, async () => {
        votesServiceMock.close.mockRejectedValue(
            new NotFoundException("Vote not found"),
        );

        await request(app.getHttpServer())
            .patch(`/v${majorVersion}/votes/${fakeVoteId}/close`)
            .expect(404);
    });

    it(`/v${majorVersion}/votes/:id (DELETE) returns 204`, async () => {
        votesServiceMock.delete.mockResolvedValue(undefined);

        await request(app.getHttpServer())
            .delete(`/v${majorVersion}/votes/${fakeVoteId}`)
            .expect(204);

        expect(votesServiceMock.delete).toHaveBeenCalledWith(
            fakeVoteId,
            fakeUser.id,
            fakeUser.role,
        );
    });

    it(`/v${majorVersion}/votes/:id (DELETE) returns 401 without auth`, async () => {
        jwtGuardCanActivateSpy.mockImplementation(() => {
            throw new UnauthorizedException("Unauthorized");
        });

        await request(app.getHttpServer())
            .delete(`/v${majorVersion}/votes/${fakeVoteId}`)
            .expect(401);
    });

    it(`/v${majorVersion}/votes/:id (DELETE) returns 403 when not creator or admin`, async () => {
        votesServiceMock.delete.mockRejectedValue(
            new ForbiddenException(
                "Only the creator or an admin can delete this vote",
            ),
        );

        await request(app.getHttpServer())
            .delete(`/v${majorVersion}/votes/${fakeVoteId}`)
            .expect(403);
    });

    it(`/v${majorVersion}/votes/:id (DELETE) returns 404 when not found`, async () => {
        votesServiceMock.delete.mockRejectedValue(
            new NotFoundException("Vote not found"),
        );

        await request(app.getHttpServer())
            .delete(`/v${majorVersion}/votes/${fakeVoteId}`)
            .expect(404);
    });

    it(`/v${majorVersion}/votes/:id (DELETE) returns 204 for admin user`, async () => {
        jwtGuardCanActivateSpy.mockImplementation((ctx: ExecutionContext) => {
            const req = ctx
                .switchToHttp()
                .getRequest<{ user: typeof fakeAdminUser }>();
            req.user = fakeAdminUser;
            return true;
        });

        votesServiceMock.delete.mockResolvedValue(undefined);

        await request(app.getHttpServer())
            .delete(`/v${majorVersion}/votes/${fakeVoteId}`)
            .expect(204);

        expect(votesServiceMock.delete).toHaveBeenCalledWith(
            fakeVoteId,
            fakeAdminUser.id,
            fakeAdminUser.role,
        );
    });
});
