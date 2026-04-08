import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { DocumentsController } from "./documents.controller";
import { DocumentsService } from "./documents.service";

const mockDoc = {
    fileId: "gridfs-id-1",
    fileName: "report.pdf",
    contentType: "application/pdf",
    size: 12345,
    uploadedBy: "user-1",
    uploadedAt: new Date(),
};

const mockService = {
    getMyDocuments: jest.fn(),
    upload: jest.fn(),
    getFileStream: jest.fn(),
    softDelete: jest.fn(),
    getAuditLog: jest.fn(),
};

describe("DocumentsController", () => {
    let controller: DocumentsController;

    beforeEach(async () => {
        jest.clearAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            controllers: [DocumentsController],
            providers: [{ provide: DocumentsService, useValue: mockService }],
        }).compile();

        controller = module.get<DocumentsController>(DocumentsController);
    });

    const req = { user: { sub: "user-1", role: "resident" } };

    it("getMyDocuments returns user files", async () => {
        mockService.getMyDocuments.mockResolvedValue([mockDoc]);
        const result = await controller.getMyDocuments(req as any);
        expect(result).toHaveLength(1);
    });

    it("upload returns document metadata", async () => {
        mockService.upload.mockResolvedValue(mockDoc);
        const file = {
            originalname: "report.pdf",
            mimetype: "application/pdf",
            buffer: Buffer.from(""),
            size: 100,
        };
        const result = await controller.upload(file as any, req as any);
        expect(result.fileId).toBe("gridfs-id-1");
    });

    it("upload throws 400 when no file", async () => {
        await expect(
            controller.upload(undefined as any, req as any),
        ).rejects.toThrow(BadRequestException);
    });

    it("remove calls softDelete with user info", async () => {
        mockService.softDelete.mockResolvedValue({ success: true });
        const result = await controller.remove("gridfs-id-1", req as any);
        expect(result.success).toBe(true);
        expect(mockService.softDelete).toHaveBeenCalledWith(
            "gridfs-id-1",
            "user-1",
            "resident",
        );
    });

    it("remove throws 403 for unauthorized user", async () => {
        mockService.softDelete.mockRejectedValue(new ForbiddenException());
        await expect(
            controller.remove("gridfs-id-1", {
                user: { sub: "other", role: "resident" },
            } as any),
        ).rejects.toThrow(ForbiddenException);
    });

    it("getAuditLog returns audit entries", async () => {
        const entries = [
            { action: "upload", userId: "user-1", createdAt: new Date() },
        ];
        mockService.getAuditLog.mockResolvedValue(entries);
        const result = await controller.getAuditLog("gridfs-id-1");
        expect(result).toHaveLength(1);
        expect(result[0].action).toBe("upload");
    });
});
