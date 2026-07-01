import { PDFDocument } from "pdf-lib";
import { PdfService, SIGNATURE_ZONES } from "./pdf.service";

const data = {
    title: "Contrat de service — Jardinage",
    payerName: "Alice Martin",
    payeeName: "Bob Dupont",
    pointsAmount: 2,
    date: "2026-07-01",
    body: "Description: tonte de la pelouse.\nPayer: u1. Payee: u2.",
};

describe("PdfService", () => {
    const svc = new PdfService();

    it("generates a valid, non-empty PDF", async () => {
        const buf = await svc.generateBaseContractPdf(data);
        expect(buf.length).toBeGreaterThan(500);
        expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
        // loads back as a 1-page PDF
        const doc = await PDFDocument.load(buf);
        expect(doc.getPageCount()).toBe(1);
    });

    it("has exactly two signature zones", () => {
        expect(SIGNATURE_ZONES).toHaveLength(2);
        expect(SIGNATURE_ZONES[0].label).toBeTruthy();
    });

    it("stampSignature returns a different, still-valid PDF", async () => {
        const base = await svc.generateBaseContractPdf(data);
        const stamped = await svc.stampSignature(base, 0, {
            name: "Alice Martin",
            date: "2026-07-01",
            hash: "deadbeef",
        });
        expect(stamped.subarray(0, 5).toString()).toBe("%PDF-");
        expect(stamped.length).not.toBe(base.length);
        await expect(PDFDocument.load(stamped)).resolves.toBeDefined();
    });

    it("rejects an out-of-range zone index", async () => {
        const base = await svc.generateBaseContractPdf(data);
        await expect(
            svc.stampSignature(base, 5, { name: "x", date: "y", hash: "z" }),
        ).rejects.toBeInstanceOf(RangeError);
    });
});
