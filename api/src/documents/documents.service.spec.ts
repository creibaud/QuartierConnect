import { ForbiddenException, Logger, NotFoundException } from "@nestjs/common";
import { getConnectionToken, getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { DocumentsService } from "./documents.service";
import { AuditAction, DocumentAudit } from "./schemas/document-audit.schema";

const VALID_OID = "507f1f77bcf86cd799439011";
const VALID_OID2 = "507f1f77bcf86cd799439012";

const mockStream = { pipe: jest.fn() };

const mockBucket = {
    find: jest.fn(),
    openUploadStreamWithId: jest.fn(),
    openDownloadStream: jest.fn().mockReturnValue(mockStream),
    delete: jest.fn(),
};

const mockAuditModel = {
    create: jest.fn(),
    find: jest.fn(),
};

const mockConnection = {
    db: {
        collection: jest.fn().mockReturnValue({
            find: jest
                .fn()
                .mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }),
            insertOne: jest.fn(),
            deleteOne: jest.fn(),
        }),
        watch: jest.fn(),
    },
};

describe("DocumentsService", () => {
    let service: DocumentsService;

    beforeEach(async () => {
        jest.clearAllMocks();
        jest.spyOn(Logger.prototype, "warn").mockImplementation(
            () => undefined,
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DocumentsService,
                {
                    provide: getModelToken(DocumentAudit.name),
                    useValue: mockAuditModel,
                },
                { provide: getConnectionToken(), useValue: mockConnection },
            ],
        }).compile();

        service = module.get<DocumentsService>(DocumentsService);
        (service as any).bucket = mockBucket;
    });

    describe("upload", () => {
        it("uploads file and creates audit log", async () => {
            const uploadStream = { end: jest.fn((_, cb: () => void) => cb()) };
            mockBucket.openUploadStreamWithId.mockReturnValue(uploadStream);
            mockAuditModel.create.mockResolvedValue({});

            const file = {
                originalname: "doc.pdf",
                mimetype: "application/pdf",
                buffer: Buffer.from("data"),
                size: 4,
            } as Express.Multer.File;

            const result = await service.upload(file, "user-1", "nb-1");
            expect(result.fileName).toBe("doc.pdf");
            expect(result.uploadedBy).toBe("user-1");
            expect(mockAuditModel.create).toHaveBeenCalledWith(
                expect.objectContaining({ action: AuditAction.UPLOAD }),
            );
        });

        it("uploads file without neighborhood", async () => {
            const uploadStream = { end: jest.fn((_, cb: () => void) => cb()) };
            mockBucket.openUploadStreamWithId.mockReturnValue(uploadStream);
            mockAuditModel.create.mockResolvedValue({});

            const file = {
                originalname: "img.png",
                mimetype: "image/png",
                buffer: Buffer.from("img"),
                size: 3,
            } as Express.Multer.File;

            const result = await service.upload(file, "user-1");
            expect(result.contentType).toBe("image/png");
        });
    });

    describe("getFileStream", () => {
        it("returns stream for file owner", async () => {
            const mockFile = {
                filename: "doc.pdf",
                contentType: "application/pdf",
                metadata: { uploadedBy: "user-1" },
            };
            mockBucket.find.mockReturnValue({
                toArray: jest.fn().mockResolvedValue([mockFile]),
            });
            mockAuditModel.create.mockResolvedValue({});

            const result = await service.getFileStream(VALID_OID, "user-1");
            expect(result.fileName).toBe("doc.pdf");
            expect(result.contentType).toBe("application/pdf");
        });

        it("returns stream when file has no ownership metadata", async () => {
            const mockFile = { filename: "doc.pdf", metadata: null };
            mockBucket.find.mockReturnValue({
                toArray: jest.fn().mockResolvedValue([mockFile]),
            });
            mockAuditModel.create.mockResolvedValue({});

            const result = await service.getFileStream(VALID_OID, "user-99");
            expect(result.contentType).toBe("application/octet-stream");
        });

        it("throws NotFoundException when file not found", async () => {
            mockBucket.find.mockReturnValue({
                toArray: jest.fn().mockResolvedValue([]),
            });

            await expect(
                service.getFileStream(VALID_OID2, "user-1"),
            ).rejects.toThrow(NotFoundException);
        });

        it("throws ForbiddenException when user is not file owner", async () => {
            const mockFile = {
                filename: "doc.pdf",
                metadata: { uploadedBy: "user-1" },
            };
            mockBucket.find.mockReturnValue({
                toArray: jest.fn().mockResolvedValue([mockFile]),
            });

            await expect(
                service.getFileStream(VALID_OID, "user-99"),
            ).rejects.toThrow(ForbiddenException);
        });
    });

    describe("softDelete", () => {
        it("deletes file for owner", async () => {
            const mockFile = {
                filename: "doc.pdf",
                metadata: { uploadedBy: "user-1" },
            };
            mockBucket.find.mockReturnValue({
                toArray: jest.fn().mockResolvedValue([mockFile]),
            });
            mockAuditModel.create.mockResolvedValue({});
            mockBucket.delete.mockResolvedValue({});

            const result = await service.softDelete(
                VALID_OID,
                "user-1",
                "resident",
            );
            expect(result.success).toBe(true);
        });

        it("deletes file for admin even if not owner", async () => {
            const mockFile = {
                filename: "doc.pdf",
                metadata: { uploadedBy: "user-1" },
            };
            mockBucket.find.mockReturnValue({
                toArray: jest.fn().mockResolvedValue([mockFile]),
            });
            mockAuditModel.create.mockResolvedValue({});
            mockBucket.delete.mockResolvedValue({});

            const result = await service.softDelete(
                VALID_OID,
                "admin-1",
                "admin",
            );
            expect(result.success).toBe(true);
        });

        it("throws NotFoundException when file not found", async () => {
            mockBucket.find.mockReturnValue({
                toArray: jest.fn().mockResolvedValue([]),
            });

            await expect(
                service.softDelete(VALID_OID2, "user-1", "resident"),
            ).rejects.toThrow(NotFoundException);
        });

        it("throws ForbiddenException when user is not owner and not admin", async () => {
            const mockFile = {
                filename: "doc.pdf",
                metadata: { uploadedBy: "user-1" },
            };
            mockBucket.find.mockReturnValue({
                toArray: jest.fn().mockResolvedValue([mockFile]),
            });

            await expect(
                service.softDelete(VALID_OID, "user-99", "resident"),
            ).rejects.toThrow(ForbiddenException);
        });
    });

    describe("getAuditLog", () => {
        it("returns audit entries for file", async () => {
            mockAuditModel.find.mockReturnValue({
                sort: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue([{ action: "upload" }]),
                }),
            });

            const result = await service.getAuditLog(VALID_OID);
            expect(result).toHaveLength(1);
        });
    });

    describe("getMyDocuments", () => {
        it("returns documents uploaded by user", async () => {
            mockBucket.find.mockReturnValue({
                toArray: jest.fn().mockResolvedValue([{ filename: "doc.pdf" }]),
            });

            const result = await service.getMyDocuments("user-1");
            expect(result).toHaveLength(1);
        });
    });
});
