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
import { TotpService } from "../src/modules/auth/totp.service";
import { DocumentsService } from "../src/modules/documents/documents.service";

describe("DocumentsController (e2e)", () => {
    let app: INestApplication<App>;
    let jwtGuardCanActivateSpy: jest.SpyInstance;

    const majorVersion = packageJson.version.split(".")[0];

    const documentsServiceMock = {
        create: jest.fn(),
        findMyDocuments: jest.fn(),
        findOne: jest.fn(),
        addSignatureZone: jest.fn(),
        inviteSigner: jest.fn(),
        sign: jest.fn(),
        getAudit: jest.fn(),
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
            .overrideProvider(TotpService)
            .useValue({ verifyToken: jest.fn().mockReturnValue(true) })
            .overrideProvider(DocumentsService)
            .useValue(documentsServiceMock)
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

    it(`/v${majorVersion}/documents (POST) returns 201 when document created`, async () => {
        const dto = { title: "My Contract", documentType: "contract" };
        const created = {
            id: "doc-1",
            creatorId: fakeUser.id,
            ...dto,
            status: "draft",
        };
        documentsServiceMock.create.mockResolvedValue(created);

        await request(app.getHttpServer())
            .post(`/v${majorVersion}/documents`)
            .send(dto)
            .expect(201)
            .expect(({ body }) => {
                expect(body).toEqual(created);
            });

        expect(documentsServiceMock.create).toHaveBeenCalledWith(
            fakeUser.id,
            dto,
        );
    });

    it(`/v${majorVersion}/documents (POST) returns 401 without auth`, async () => {
        jwtGuardCanActivateSpy.mockImplementation(() => {
            throw new UnauthorizedException("Unauthorized");
        });

        await request(app.getHttpServer())
            .post(`/v${majorVersion}/documents`)
            .send({ title: "Test", documentType: "contract" })
            .expect(401);
    });

    it(`/v${majorVersion}/documents (GET) returns 200 with paginated documents`, async () => {
        const result = {
            data: [{ id: "doc-1", title: "My Doc" }],
            meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
        };
        documentsServiceMock.findMyDocuments.mockResolvedValue(result);

        await request(app.getHttpServer())
            .get(`/v${majorVersion}/documents`)
            .expect(200)
            .expect(({ body }) => {
                expect(body).toEqual(result);
            });

        expect(documentsServiceMock.findMyDocuments).toHaveBeenCalledWith(
            fakeUser.id,
            expect.any(Object),
        );
    });

    it(`/v${majorVersion}/documents (GET) returns 401 without auth`, async () => {
        jwtGuardCanActivateSpy.mockImplementation(() => {
            throw new UnauthorizedException("Unauthorized");
        });

        await request(app.getHttpServer())
            .get(`/v${majorVersion}/documents`)
            .expect(401);
    });

    it(`/v${majorVersion}/documents/:id (GET) returns 200 with document`, async () => {
        const docId = "doc-abc";
        const doc = { id: docId, title: "My Doc", creatorId: fakeUser.id };
        documentsServiceMock.findOne.mockResolvedValue(doc);

        await request(app.getHttpServer())
            .get(`/v${majorVersion}/documents/${docId}`)
            .expect(200)
            .expect(({ body }) => {
                expect(body).toEqual(doc);
            });

        expect(documentsServiceMock.findOne).toHaveBeenCalledWith(
            docId,
            fakeUser.id,
        );
    });

    it(`/v${majorVersion}/documents/:id (GET) returns 404 when not found`, async () => {
        documentsServiceMock.findOne.mockRejectedValue(
            new NotFoundException("Document not found"),
        );

        await request(app.getHttpServer())
            .get(`/v${majorVersion}/documents/nonexistent`)
            .expect(404);
    });

    it(`/v${majorVersion}/documents/:id (GET) returns 403 when not authorized`, async () => {
        documentsServiceMock.findOne.mockRejectedValue(
            new ForbiddenException(
                "You are not authorized to view this document",
            ),
        );

        await request(app.getHttpServer())
            .get(`/v${majorVersion}/documents/doc-abc`)
            .expect(403);
    });

    it(`/v${majorVersion}/documents/:id/zones (POST) returns 201 when zone added`, async () => {
        const docId = "doc-abc";
        const dto = { signerId: "signer-id", x: 100, y: 200, page: 1 };
        const updated = { id: docId, title: "My Doc", signatures: [dto] };
        documentsServiceMock.addSignatureZone.mockResolvedValue(updated);

        await request(app.getHttpServer())
            .post(`/v${majorVersion}/documents/${docId}/zones`)
            .send(dto)
            .expect(201)
            .expect(({ body }) => {
                expect(body).toEqual(updated);
            });

        expect(documentsServiceMock.addSignatureZone).toHaveBeenCalledWith(
            docId,
            fakeUser.id,
            dto,
        );
    });

    it(`/v${majorVersion}/documents/:id/zones (POST) returns 403 when not creator`, async () => {
        documentsServiceMock.addSignatureZone.mockRejectedValue(
            new ForbiddenException("Only the creator can add signature zones"),
        );

        await request(app.getHttpServer())
            .post(`/v${majorVersion}/documents/doc-abc/zones`)
            .send({ signerId: "signer-id", x: 100, y: 200, page: 1 })
            .expect(403);
    });

    it(`/v${majorVersion}/documents/:id/invite (POST) returns 201 when signer invited`, async () => {
        const docId = "doc-abc";
        const dto = { signerUserId: "new-signer-id" };
        const updated = {
            id: docId,
            title: "My Doc",
            sharedWith: [dto.signerUserId],
        };
        documentsServiceMock.inviteSigner.mockResolvedValue(updated);

        await request(app.getHttpServer())
            .post(`/v${majorVersion}/documents/${docId}/invite`)
            .send(dto)
            .expect(201)
            .expect(({ body }) => {
                expect(body).toEqual(updated);
            });

        expect(documentsServiceMock.inviteSigner).toHaveBeenCalledWith(
            docId,
            fakeUser.id,
            dto,
        );
    });

    it(`/v${majorVersion}/documents/:id/invite (POST) returns 403 when not creator`, async () => {
        documentsServiceMock.inviteSigner.mockRejectedValue(
            new ForbiddenException("Only the creator can invite signers"),
        );

        await request(app.getHttpServer())
            .post(`/v${majorVersion}/documents/doc-abc/invite`)
            .send({ signerUserId: "signer-id" })
            .expect(403);
    });

    it(`/v${majorVersion}/documents/:id/sign (POST) returns 201 when document signed`, async () => {
        const docId = "doc-abc";
        const dto = { totpCode: "123456", signatureImageBase64: "base64data" };
        const signed = { id: docId, status: "fully_signed" };
        documentsServiceMock.sign.mockResolvedValue(signed);

        await request(app.getHttpServer())
            .post(`/v${majorVersion}/documents/${docId}/sign`)
            .send(dto)
            .expect(201)
            .expect(({ body }) => {
                expect(body).toEqual(signed);
            });

        expect(documentsServiceMock.sign).toHaveBeenCalledWith(
            docId,
            fakeUser.id,
            dto,
        );
    });

    it(`/v${majorVersion}/documents/:id/sign (POST) returns 404 when no pending signature`, async () => {
        documentsServiceMock.sign.mockRejectedValue(
            new NotFoundException("No pending signature found for this user"),
        );

        await request(app.getHttpServer())
            .post(`/v${majorVersion}/documents/doc-abc/sign`)
            .send({ totpCode: "123456" })
            .expect(404);
    });

    it(`/v${majorVersion}/documents/:id/audit (GET) returns 200 with audit entries`, async () => {
        const docId = "doc-abc";
        const entries = [
            {
                id: "audit-1",
                actionType: "view",
                performedByUserId: fakeUser.id,
            },
        ];
        documentsServiceMock.getAudit.mockResolvedValue(entries);

        await request(app.getHttpServer())
            .get(`/v${majorVersion}/documents/${docId}/audit`)
            .expect(200)
            .expect(({ body }) => {
                expect(body).toEqual(entries);
            });

        expect(documentsServiceMock.getAudit).toHaveBeenCalledWith(
            docId,
            fakeUser.id,
        );
    });

    it(`/v${majorVersion}/documents/:id/audit (GET) returns 403 when not authorized`, async () => {
        documentsServiceMock.getAudit.mockRejectedValue(
            new ForbiddenException(
                "You are not authorized to view this document",
            ),
        );

        await request(app.getHttpServer())
            .get(`/v${majorVersion}/documents/doc-abc/audit`)
            .expect(403);
    });
});
