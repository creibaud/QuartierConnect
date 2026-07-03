import { PDFDocument } from "pdf-lib";
import {
    SignatureZone,
    SignatureZoneKind,
} from "../contracts/schemas/contract.schema";
import {
    deriveInitials,
    normalizedZoneToPdfBox,
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

// 64x32 transparent PNG with a black signature-like stroke.
const PNG_DATA_URL =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAgCAYAAACinX6EAAAAoUlEQVR42u2YQQ7AIAgE/f+n6b2HpioZFt1JempKlxWjMIYxxhiMeD3XJq5iQlQnX2lCVBgw865KE+5yhQkyyePlSCcfYsLwfa8mUK70SYHo6qsJ/YwZgi63NCC6xspctbbVtPszfN9mx8gwoP2JctrZvfTdKbe3ZV0zV1iyiUH7ij+JqXZwabrUe3hEl/IUB9OlOsdDdalOcq+dMBtj8ngAlf+/QZqk6iAAAAAASUVORK5CYII=";

// 1x1 opaque black pixel: stretched to a box it renders as a solid black
// rectangle, so stampSignature must reject it as a signature image.
const DEGENERATE_PNG_DATA_URL =
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

    it("falls back to a typed signature for a degenerate 1x1 image", async () => {
        const base = await service.generateBaseContractPdf(DATA);
        const stamped = await service.stampSignature(base, 0, {
            name: "Alice",
            date: "2026-07-01",
            hash: "abcd1234",
            image: DEGENERATE_PNG_DATA_URL,
        });
        expect(stamped.subarray(0, 5).toString()).toBe("%PDF-");
        await expect(PDFDocument.load(stamped)).resolves.toBeDefined();
    });

    it("shrinks a long typed signature to fit the signing zone", async () => {
        const base = await service.generateBaseContractPdf(DATA);
        const stamped = await service.stampSignature(base, 1, {
            name: "Anne-Charlotte de la Rochefoucauld-Montbazon",
            date: "2026-07-01",
            hash: "abcd1234",
        });
        expect(stamped.subarray(0, 5).toString()).toBe("%PDF-");
    });
});

describe("normalizedZoneToPdfBox", () => {
    it("scales the zone and flips the top-left origin to pdf-lib's bottom-left", () => {
        const box = normalizedZoneToPdfBox(
            { x: 0.25, y: 0.5, w: 0.4, h: 0.1 },
            600,
            800,
        );
        expect(box).toEqual({ x: 150, y: 320, width: 240, height: 80 });
    });

    it("maps a zone at the top of the page to the top in pdf coordinates", () => {
        const box = normalizedZoneToPdfBox(
            { x: 0, y: 0, w: 0.5, h: 0.1 },
            595.28,
            841.89,
        );
        expect(box.y).toBeCloseTo(841.89 * 0.9, 5);
    });

    it("maps a zone at the bottom of the page to y = 0", () => {
        const box = normalizedZoneToPdfBox(
            { x: 0.5, y: 0.9, w: 0.5, h: 0.1 },
            595.28,
            841.89,
        );
        expect(box.y).toBeCloseTo(0, 5);
    });
});

describe("deriveInitials", () => {
    it.each([
        ["Alice Martin", "A.M."],
        ["alice@demo.fr", "A."],
        ["Anne-Charlotte Dupont", "A.C.D."],
        ["Jean Marie Le Pennec", "J.M.L."],
    ])("derives %s to %s", (name, expected) => {
        expect(deriveInitials(name)).toBe(expected);
    });
});

async function buildPlainPdf(pageCount: number): Promise<Buffer> {
    const doc = await PDFDocument.create();
    for (let index = 0; index < pageCount; index += 1) {
        doc.addPage([595.28, 841.89]).drawText(`Page ${index + 1}`, {
            x: 60,
            y: 780,
            size: 12,
        });
    }
    return Buffer.from(await doc.save());
}

function zone(overrides: Partial<SignatureZone> = {}): SignatureZone {
    return {
        page: 1,
        x: 0.1,
        y: 0.75,
        w: 0.3,
        h: 0.1,
        signerId: "user-1",
        kind: SignatureZoneKind.SIGNATURE,
        ...overrides,
    };
}

describe("PdfService.stampSignatureAtZones", () => {
    const service = new PdfService();
    const stamp = { name: "Alice Martin", date: "2026-07-02", hash: "cafe01" };

    it("stamps several zones across pages and keeps the PDF valid", async () => {
        const base = await buildPlainPdf(3);
        const stamped = await service.stampSignatureAtZones(
            base,
            [
                zone(),
                zone({
                    page: 3,
                    x: 0.85,
                    y: 0.9,
                    w: 0.1,
                    h: 0.05,
                    kind: SignatureZoneKind.INITIALS,
                }),
            ],
            stamp,
        );
        expect(stamped.subarray(0, 5).toString()).toBe("%PDF-");
        expect(stamped.length).not.toBe(base.length);
        const doc = await PDFDocument.load(stamped);
        expect(doc.getPageCount()).toBe(3);
    });

    it("embeds the drawn PNG scaled into the zone box", async () => {
        const base = await buildPlainPdf(1);
        const textOnly = await service.stampSignatureAtZones(
            base,
            [zone()],
            stamp,
        );
        const withImage = await service.stampSignatureAtZones(base, [zone()], {
            ...stamp,
            image: PNG_DATA_URL,
        });
        expect(withImage.length).toBeGreaterThan(textOnly.length);
    });

    it("scales the PNG down for a small initials zone", async () => {
        const base = await buildPlainPdf(1);
        const stamped = await service.stampSignatureAtZones(
            base,
            [
                zone({
                    x: 0.9,
                    y: 0.95,
                    w: 0.06,
                    h: 0.03,
                    kind: SignatureZoneKind.INITIALS,
                }),
            ],
            { ...stamp, image: PNG_DATA_URL },
        );
        await expect(PDFDocument.load(stamped)).resolves.toBeDefined();
    });

    it("falls back to cursive initials when the image is degenerate", async () => {
        const base = await buildPlainPdf(1);
        const stamped = await service.stampSignatureAtZones(
            base,
            [zone({ kind: SignatureZoneKind.INITIALS })],
            { ...stamp, image: DEGENERATE_PNG_DATA_URL },
        );
        await expect(PDFDocument.load(stamped)).resolves.toBeDefined();
    });

    it("skips the caption in a zone too small to hold it", async () => {
        const base = await buildPlainPdf(1);
        const stamped = await service.stampSignatureAtZones(
            base,
            [zone({ h: 0.02 })],
            stamp,
        );
        await expect(PDFDocument.load(stamped)).resolves.toBeDefined();
    });

    it("rejects a zone pointing past the last page", async () => {
        const base = await buildPlainPdf(1);
        await expect(
            service.stampSignatureAtZones(base, [zone({ page: 2 })], stamp),
        ).rejects.toBeInstanceOf(RangeError);
    });

    it("rejects an empty zones list", async () => {
        const base = await buildPlainPdf(1);
        await expect(
            service.stampSignatureAtZones(base, [], stamp),
        ).rejects.toBeInstanceOf(RangeError);
    });
});
