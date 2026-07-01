import { ContractDocumentsService } from "./contract-documents.service";

function makeService() {
    const updateOne = jest.fn().mockResolvedValue(undefined);
    const findOne = jest.fn();
    const docModel = { updateOne, findOne } as any;
    const svc = new ContractDocumentsService(docModel, {
        db: {},
    } as any);
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

describe("ContractDocumentsService.getPdfStream", () => {
    it("returns null and does not audit when there is no PDF yet", async () => {
        const { svc, findOne, updateOne } = makeService();
        findOne.mockResolvedValue(null);
        const res = await svc.getPdfStream("c1", "u1");
        expect(res).toBeNull();
        expect(updateOne).not.toHaveBeenCalled();
    });
});
