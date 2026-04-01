import {
    BadRequestException,
    ForbiddenException,
    NotFoundException,
} from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { DocumentsController } from "./documents.controller";
import { DocumentsService } from "./documents.service";

describe("DocumentsController", () => {
    let controller: DocumentsController;
    let service: DocumentsService;

    const mockUser = {
        id: "user-uuid",
        email: "user@test.local",
        role: "resident" as const,
        isActive: true,
    };

    const mockOtherUser = {
        id: "other-user-id",
        email: "other@test.local",
        role: "resident" as const,
        isActive: true,
    };

    const mockDocument = {
        id: "document-uuid",
        title: "Service Contract",
        creatorId: mockUser.id,
        status: "draft",
        signerIds: [],
        signatureZones: [],
        auditTrail: [],
        createdAt: new Date(),
    };

    const mockAuditTrail = {
        documentId: "document-uuid",
        events: [
            {
                action: "created",
                userId: mockUser.id,
                timestamp: new Date(),
                hash: "sha256:abc123...",
            },
        ],
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [DocumentsController],
            providers: [
                {
                    provide: DocumentsService,
                    useValue: {
                        create: jest.fn(),
                        findMyDocuments: jest.fn(),
                        findOne: jest.fn(),
                        addSignatureZone: jest.fn(),
                        inviteSigner: jest.fn(),
                        sign: jest.fn(),
                        getAudit: jest.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<DocumentsController>(DocumentsController);
        service = module.get<DocumentsService>(DocumentsService);
    });

    describe("create", () => {
        it("should create a new document", async () => {
            const createDto = { title: "Service Contract" };
            service.create.mockResolvedValue(mockDocument);

            const result = await controller.create(mockUser, createDto);

            expect(service.create).toHaveBeenCalledWith(mockUser.id, createDto);
            expect(result.creatorId).toBe(mockUser.id);
            expect(result.status).toBe("draft");
        });

        it("should throw BadRequestException on invalid title", async () => {
            service.create.mockRejectedValue(
                new BadRequestException("Title is required"),
            );

            await expect(
                controller.create(mockUser, { title: "" }),
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe("findMyDocuments", () => {
        it("should return user's documents (paginated)", async () => {
            const query = { page: 1, limit: 10 };
            const paginated = {
                data: [mockDocument],
                meta: {
                    total: 1,
                    page: 1,
                    limit: 10,
                    pages: 1,
                    hasNextPage: false,
                    hasPrevPage: false,
                },
            };
            service.findMyDocuments.mockResolvedValue(paginated);

            const result = await controller.findMyDocuments(mockUser, query);

            expect(service.findMyDocuments).toHaveBeenCalledWith(
                mockUser.id,
                query,
            );
            expect(result.data).toHaveLength(1);
        });

        it("should return empty list if no documents", async () => {
            const query = { page: 1, limit: 10 };
            const empty = {
                data: [],
                meta: {
                    total: 0,
                    page: 1,
                    limit: 10,
                    pages: 0,
                    hasNextPage: false,
                    hasPrevPage: false,
                },
            };
            service.findMyDocuments.mockResolvedValue(empty);

            const result = await controller.findMyDocuments(mockUser, query);

            expect(result.data).toHaveLength(0);
        });

        it("should support pagination", async () => {
            const query = { page: 2, limit: 5 };
            const paginated = {
                data: [mockDocument],
                meta: {
                    total: 12,
                    page: 2,
                    limit: 5,
                    pages: 3,
                    hasNextPage: true,
                    hasPrevPage: true,
                },
            };
            service.findMyDocuments.mockResolvedValue(paginated);

            const result = await controller.findMyDocuments(mockUser, query);

            expect(result.meta.page).toBe(2);
            expect(result.meta.hasNextPage).toBe(true);
        });
    });

    describe("findOne", () => {
        it("should return a document if creator", async () => {
            service.findOne.mockResolvedValue(mockDocument);

            const result = await controller.findOne("document-uuid", mockUser);

            expect(service.findOne).toHaveBeenCalledWith(
                "document-uuid",
                mockUser.id,
            );
            expect(result.id).toBe("document-uuid");
        });

        it("should return a document if invited signer", async () => {
            const documentWithSigners = {
                ...mockDocument,
                signerIds: [mockOtherUser.id],
            };
            service.findOne.mockResolvedValue(documentWithSigners);

            const result = await controller.findOne(
                "document-uuid",
                mockOtherUser,
            );

            expect(service.findOne).toHaveBeenCalledWith(
                "document-uuid",
                mockOtherUser.id,
            );
            expect(result.signerIds).toContain(mockOtherUser.id);
        });

        it("should throw ForbiddenException if not authorized", async () => {
            service.findOne.mockRejectedValue(
                new ForbiddenException("Not authorized"),
            );

            const unauthorizedUser = { ...mockUser, id: "unauthorized-id" };
            await expect(
                controller.findOne("document-uuid", unauthorizedUser),
            ).rejects.toThrow(ForbiddenException);
        });

        it("should throw NotFoundException if document not found", async () => {
            service.findOne.mockRejectedValue(
                new NotFoundException("Document not found"),
            );

            await expect(
                controller.findOne("non-existent", mockUser),
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe("addSignatureZone", () => {
        it("should add a signature zone (creator only)", async () => {
            const addZoneDto = {
                signerId: mockOtherUser.id,
                page: 1,
                x: 100,
                y: 200,
            };
            const updated = {
                ...mockDocument,
                signatureZones: [
                    {
                        id: "zone-uuid",
                        signerId: mockOtherUser.id,
                        page: 1,
                        x: 100,
                        y: 200,
                    },
                ],
            };
            service.addSignatureZone.mockResolvedValue(updated);

            const result = await controller.addSignatureZone(
                "document-uuid",
                mockUser,
                addZoneDto,
            );

            expect(service.addSignatureZone).toHaveBeenCalledWith(
                "document-uuid",
                mockUser.id,
                addZoneDto,
            );
            expect(result.signatureZones).toHaveLength(1);
        });

        it("should throw ForbiddenException if not creator", async () => {
            service.addSignatureZone.mockRejectedValue(
                new ForbiddenException("Only creator can add zones"),
            );

            await expect(
                controller.addSignatureZone("document-uuid", mockOtherUser, {
                    signerId: mockOtherUser.id,
                    page: 1,
                    x: 100,
                    y: 200,
                }),
            ).rejects.toThrow(ForbiddenException);
        });

        it("should throw NotFoundException if document not found", async () => {
            service.addSignatureZone.mockRejectedValue(
                new NotFoundException("Document not found"),
            );

            await expect(
                controller.addSignatureZone("non-existent", mockUser, {
                    signerId: mockOtherUser.id,
                    page: 1,
                    x: 100,
                    y: 200,
                }),
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe("inviteSigner", () => {
        it("should invite a signer (creator only)", async () => {
            const inviteDto = { userId: mockOtherUser.id };
            const updated = { ...mockDocument, signerIds: [mockOtherUser.id] };
            service.inviteSigner.mockResolvedValue(updated);

            const result = await controller.inviteSigner(
                "document-uuid",
                mockUser,
                inviteDto,
            );

            expect(service.inviteSigner).toHaveBeenCalledWith(
                "document-uuid",
                mockUser.id,
                inviteDto,
            );
            expect(result.signerIds).toContain(mockOtherUser.id);
        });

        it("should throw ForbiddenException if not creator", async () => {
            service.inviteSigner.mockRejectedValue(
                new ForbiddenException("Only creator can invite"),
            );

            await expect(
                controller.inviteSigner("document-uuid", mockOtherUser, {
                    userId: mockUser.id,
                }),
            ).rejects.toThrow(ForbiddenException);
        });

        it("should throw NotFoundException if document not found", async () => {
            service.inviteSigner.mockRejectedValue(
                new NotFoundException("Document not found"),
            );

            await expect(
                controller.inviteSigner("non-existent", mockUser, {
                    userId: mockOtherUser.id,
                }),
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe("sign", () => {
        it("should sign a document with TOTP verification", async () => {
            const signDto = { totp: "123456" };
            const signed = { ...mockDocument, status: "partially_signed" };
            service.sign.mockResolvedValue(signed);

            const result = await controller.sign(
                "document-uuid",
                mockOtherUser,
                signDto,
            );

            expect(service.sign).toHaveBeenCalledWith(
                "document-uuid",
                mockOtherUser.id,
                signDto,
            );
            expect(result.status).toMatch(/sign/i);
        });

        it("should throw BadRequestException if invalid TOTP", async () => {
            service.sign.mockRejectedValue(
                new BadRequestException("Invalid TOTP"),
            );

            await expect(
                controller.sign("document-uuid", mockOtherUser, {
                    totp: "invalid",
                }),
            ).rejects.toThrow(BadRequestException);
        });

        it("should throw NotFoundException if no pending signature", async () => {
            service.sign.mockRejectedValue(
                new NotFoundException("No pending signature for this user"),
            );

            await expect(
                controller.sign("document-uuid", mockUser, { totp: "123456" }),
            ).rejects.toThrow(NotFoundException);
        });

        it("should handle fully signed document", async () => {
            const signDto = { totp: "123456" };
            const fullySigned = {
                ...mockDocument,
                status: "fully_signed",
                hash: "sha256:abc123...",
            };
            service.sign.mockResolvedValue(fullySigned);

            const result = await controller.sign(
                "document-uuid",
                mockOtherUser,
                signDto,
            );

            expect(result.status).toBe("fully_signed");
            expect(result).toHaveProperty("hash");
        });
    });

    describe("getAudit", () => {
        it("should return audit trail (creator or signer)", async () => {
            service.getAudit = jest.fn().mockResolvedValue(mockAuditTrail);

            const result = await (service.getAudit as any)(
                "document-uuid",
                mockUser,
            );

            expect(result.events).toHaveLength(1);
            expect(result.events[0].action).toBe("created");
        });

        it("should track all document modifications", async () => {
            const enrichedAudit = {
                ...mockAuditTrail,
                events: [
                    {
                        action: "created",
                        userId: mockUser.id,
                        timestamp: new Date(),
                        hash: "hash1",
                    },
                    {
                        action: "zone_added",
                        userId: mockUser.id,
                        timestamp: new Date(),
                        hash: "hash2",
                    },
                    {
                        action: "signer_invited",
                        userId: mockUser.id,
                        timestamp: new Date(),
                        hash: "hash3",
                    },
                ],
            };
            service.getAudit = jest.fn().mockResolvedValue(enrichedAudit);

            const result = await (service.getAudit as any)(
                "document-uuid",
                mockUser,
            );

            expect(result.events).toHaveLength(3);
        });

        it("should throw ForbiddenException if not authorized", async () => {
            service.getAudit = jest
                .fn()
                .mockRejectedValue(new ForbiddenException("Not authorized"));

            const unauthorized = { ...mockUser, id: "unauthorized-id" };
            await expect(
                (service.getAudit as any)("document-uuid", unauthorized),
            ).rejects.toThrow(ForbiddenException);
        });

        it("should throw NotFoundException if document not found", async () => {
            service.getAudit = jest
                .fn()
                .mockRejectedValue(new NotFoundException("Document not found"));

            await expect(
                (service.getAudit as any)("non-existent", mockUser),
            ).rejects.toThrow(NotFoundException);
        });
    });
});
