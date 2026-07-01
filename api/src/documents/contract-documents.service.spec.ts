import { ContractDocumentsService } from "./contract-documents.service";
import { PdfService } from "./pdf.service";

function makeService() {
    const updateOne = jest.fn().mockResolvedValue(undefined);
    const findOne = jest.fn();
    const docModel = { updateOne, findOne } as any;
    const svc = new ContractDocumentsService(
        docModel,
        { db: {} } as any,
        new PdfService(),
    );
    // stub the GridFS write so storePdf exercises only the audit path
    (svc as unknown as { writeToGridFs: unknown }).writeToGridFs = jest
        .fn()
        .mockResolvedValue("f8f8f8f8f8f8f8f8f8f8f8f8");
    return { svc, updateOne, findOne };
}

describe("ContractDocumentsService.storePdf", () => {
    it("upserts pdfFileId/sha256 and pushes an append-only audit entry", async () => {
        const { svc, updateOne } = makeService();
        const res = await svc.storePdf(
            "c1",
            Buffer.from("%PDF-1.7 test"),
            "generated",
            "u1",
        );
        expect(res.fileId).toBe("f8f8f8f8f8f8f8f8f8f8f8f8");
        expect(res.sha256).toMatch(/^[a-f0-9]{64}$/);
        const [filter, update, opts] = updateOne.mock.calls[0];
        expect(filter).toEqual({ contractId: "c1" });
        expect(update.$set).toEqual(
            expect.objectContaining({
                pdfFileId: res.fileId,
                sha256Hash: res.sha256,
            }),
        );
        expect(update.$push.auditLog).toEqual(
            expect.objectContaining({ action: "generated", userId: "u1" }),
        );
        expect(opts).toEqual({ upsert: true });
    });
});

describe("ContractDocumentsService.getCurrentPdf", () => {
    it("returns null when the doc has no pdfFileId", async () => {
        const { svc, findOne } = makeService();
        findOne.mockResolvedValue({ pdfFileId: null });
        await expect(svc.getCurrentPdf("c1")).resolves.toBeNull();
    });

    it("reads and returns the stored PDF buffer", async () => {
        const { svc, findOne } = makeService();
        findOne.mockResolvedValue({ pdfFileId: "f1" });
        const buffer = Buffer.from("%PDF-");
        (svc as unknown as { readFromGridFs: unknown }).readFromGridFs = jest
            .fn()
            .mockResolvedValue(buffer);
        await expect(svc.getCurrentPdf("c1")).resolves.toBe(buffer);
    });
});

describe("ContractDocumentsService.getPdfStream", () => {
    it("returns null and does not audit when there is no PDF yet", async () => {
        const { svc, findOne, updateOne } = makeService();
        findOne.mockResolvedValue(null);
        const res = await svc.getPdfStream("c1", "u1");
        expect(res).toBeNull();
        expect(updateOne).not.toHaveBeenCalled();
    });

    it("appends a viewed audit entry and returns the download stream", async () => {
        const { svc, findOne, updateOne } = makeService();
        findOne.mockResolvedValue({
            pdfFileId: "507f1f77bcf86cd799439011",
        });
        const fakeStream = {} as NodeJS.ReadableStream;
        Object.defineProperty(svc, "bucket", {
            get: () => ({ openDownloadStream: () => fakeStream }),
        });

        const res = await svc.getPdfStream("c1", "u1");

        expect(res).toEqual({
            stream: fakeStream,
            fileName: "contract-c1.pdf",
        });
        const [, update] = updateOne.mock.calls[0];
        expect(update.$push.auditLog).toEqual(
            expect.objectContaining({ action: "viewed", userId: "u1" }),
        );
    });
});

describe("ContractDocumentsService GridFS helpers", () => {
    function bareService() {
        const docModel = { updateOne: jest.fn(), findOne: jest.fn() } as any;
        return new ContractDocumentsService(
            docModel,
            { db: {} } as any,
            new PdfService(),
        );
    }

    it("writeToGridFs streams the buffer and resolves the new file id", async () => {
        const svc = bareService();
        const uploadStream = {
            on: jest.fn(),
            end: jest.fn((_buffer: Buffer, done: () => void) => done()),
        };
        const openUploadStreamWithId = jest.fn().mockReturnValue(uploadStream);
        Object.defineProperty(svc, "bucket", {
            get: () => ({ openUploadStreamWithId }),
        });

        const fileId = await (
            svc as unknown as {
                writeToGridFs: (id: string, buffer: Buffer) => Promise<string>;
            }
        ).writeToGridFs("c1", Buffer.from("%PDF-"));

        expect(fileId).toMatch(/^[a-f0-9]{24}$/);
        expect(openUploadStreamWithId).toHaveBeenCalledWith(
            expect.anything(),
            "contract-c1.pdf",
            expect.objectContaining({
                metadata: expect.objectContaining({ contractId: "c1" }),
            }),
        );
    });

    it("readFromGridFs concatenates the download stream chunks", async () => {
        const svc = bareService();
        const handlers: Record<string, (chunk?: Buffer) => void> = {};
        const downloadStream: { on: jest.Mock } = {
            on: jest.fn((event: string, cb: (chunk?: Buffer) => void) => {
                handlers[event] = cb;
                return downloadStream;
            }),
        };
        Object.defineProperty(svc, "bucket", {
            get: () => ({ openDownloadStream: () => downloadStream }),
        });

        const promise = (
            svc as unknown as {
                readFromGridFs: (id: string) => Promise<Buffer>;
            }
        ).readFromGridFs("507f1f77bcf86cd799439011");
        handlers.data(Buffer.from("%PDF"));
        handlers.data(Buffer.from("-1.7"));
        handlers.end();

        await expect(promise).resolves.toEqual(Buffer.from("%PDF-1.7"));
    });
});

describe("ContractDocumentsService.getAudit", () => {
    it("returns the stored audit log when the doc exists", async () => {
        const { svc, findOne } = makeService();
        const auditLog = [
            { action: "generated", userId: "u1", at: new Date() },
        ];
        findOne.mockResolvedValue({ auditLog });
        await expect(svc.getAudit("c1")).resolves.toBe(auditLog);
    });

    it("returns an empty array when the doc does not exist", async () => {
        const { svc, findOne } = makeService();
        findOne.mockResolvedValue(null);
        await expect(svc.getAudit("c1")).resolves.toEqual([]);
    });
});
