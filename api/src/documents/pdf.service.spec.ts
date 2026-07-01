import { PDFDocument } from "pdf-lib";
import {
    PdfService,
    SIGNATURE_ZONES,
    type ContractPdfData,
} from "./pdf.service";

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

// 1x1 transparent PNG.
const PNG_DATA_URL =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC";

const DATA: ContractPdfData = {
    title: "Contrat de test",
    payerName: "Alice",
    payeeName: "Bob",
    pointsAmount: 20,
    date: "2026-07-01",
    body: "Prestation de jardinage.",
};

describe("PdfService.stampSignature", () => {
    const service = new PdfService();

    it("draws a valid PDF with only text when no image is given", async () => {
        const base = await service.generateBaseContractPdf(DATA);
        const stamped = await service.stampSignature(base, 0, {
            name: "Alice",
            date: "2026-07-01",
            hash: "abcd1234",
        });
        expect(stamped.subarray(0, 5).toString()).toBe("%PDF-");
    });

    it("embeds the PNG image when provided (larger than text-only stamp)", async () => {
        const base = await service.generateBaseContractPdf(DATA);
        const textOnly = await service.stampSignature(base, 0, {
            name: "Alice",
            date: "2026-07-01",
            hash: "abcd1234",
        });
        const withImage = await service.stampSignature(base, 0, {
            name: "Alice",
            date: "2026-07-01",
            hash: "abcd1234",
            image: PNG_DATA_URL,
        });
        expect(withImage.subarray(0, 5).toString()).toBe("%PDF-");
        expect(withImage.length).toBeGreaterThan(textOnly.length);
    });

    it("falls back to text if the image is malformed", async () => {
        const base = await service.generateBaseContractPdf(DATA);
        const stamped = await service.stampSignature(base, 0, {
            name: "Alice",
            date: "2026-07-01",
            hash: "abcd1234",
            image: "data:image/png;base64,not-a-real-png",
        });
        expect(stamped.subarray(0, 5).toString()).toBe("%PDF-");
    });
});
