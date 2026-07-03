import * as crypto from "crypto";
import { Injectable } from "@nestjs/common";
import {
    PDFDocument,
    PDFFont,
    PDFImage,
    PDFPage,
    rgb,
    StandardFonts,
} from "pdf-lib";
import { formatPointsAmount } from "../contracts/lib/format";
import {
    SignatureZone,
    SignatureZoneKind,
} from "../contracts/schemas/contract.schema";

export interface ContractPdfData {
    title: string;
    payerName: string;
    payeeName: string;
    pointsAmount: number;
    date: string;
    body: string;
}

export interface SignatureStamp {
    name: string;
    date: string;
    hash: string;
    image?: string;
}

export interface PdfBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

// Zones are normalized (0..1) with a TOP-LEFT origin; pdf-lib draws from the
// BOTTOM-LEFT corner, hence y_pdf = pageHeight * (1 - y - h).
export function normalizedZoneToPdfBox(
    zone: Pick<SignatureZone, "x" | "y" | "w" | "h">,
    pageWidth: number,
    pageHeight: number,
): PdfBox {
    return {
        x: zone.x * pageWidth,
        y: pageHeight * (1 - zone.y - zone.h),
        width: zone.w * pageWidth,
        height: zone.h * pageHeight,
    };
}

export function deriveInitials(name: string): string {
    const parts = name.split(/[\s-]+/).filter(Boolean);
    if (parts.length === 0) return "?";
    return (
        parts
            .slice(0, 3)
            .map((part) => part[0].toUpperCase())
            .join(".") + "."
    );
}

// A4 = 595.28 x 841.89 pt. Zones are the baseline of each signatory block.
export const SIGNATURE_ZONES: { x: number; y: number; label: string }[] = [
    { x: 60, y: 140, label: "Payeur" },
    { x: 320, y: 140, label: "Bénéficiaire" },
];

const ZONE_BOX = { offsetX: -6, offsetY: -8, width: 212, height: 96 };
const ZONE_LINE_WIDTH = 200;
const ZONE_FILL = rgb(0.98, 0.97, 0.95);
const ZONE_BORDER = rgb(0.72, 0.68, 0.62);
const ZONE_LINE = rgb(0.55, 0.5, 0.45);
const INK_BLUE = rgb(0.12, 0.2, 0.45);
const MIN_STAMP_IMAGE_WIDTH = 16;
const MIN_STAMP_IMAGE_HEIGHT = 8;

function wrapLines(text: string, max: number): string[] {
    const out: string[] = [];
    for (const raw of text.split("\n")) {
        let line = "";
        for (const word of raw.split(" ")) {
            if ((line + " " + word).trim().length > max) {
                out.push(line.trim());
                line = word;
            } else {
                line = (line + " " + word).trim();
            }
        }
        out.push(line);
    }
    return out;
}

function fitTextSize(
    font: PDFFont,
    text: string,
    preferredSize: number,
    maxWidth: number,
    minSize = 9,
): number {
    const width = font.widthOfTextAtSize(text, preferredSize);
    if (width <= maxWidth) return preferredSize;
    return Math.max(minSize, (preferredSize * maxWidth) / width);
}

@Injectable()
export class PdfService {
    async generateBaseContractPdf(data: ContractPdfData): Promise<Buffer> {
        const doc = await PDFDocument.create();
        const page = doc.addPage([595.28, 841.89]);
        const font = await doc.embedFont(StandardFonts.Helvetica);
        const bold = await doc.embedFont(StandardFonts.HelveticaBold);

        const draw = (
            text: string,
            x: number,
            y: number,
            size = 11,
            f: PDFFont = font,
        ) => page.drawText(text, { x, y, size, font: f, color: rgb(0, 0, 0) });

        let y = 800;
        draw(data.title, 60, y, 18, bold);
        y -= 36;
        draw(`Payeur : ${data.payerName}`, 60, y);
        y -= 18;
        draw(`Bénéficiaire : ${data.payeeName}`, 60, y);
        y -= 18;
        draw(`Montant : ${formatPointsAmount(data.pointsAmount)}`, 60, y);
        y -= 18;
        draw(`Date : ${data.date}`, 60, y);
        y -= 34;
        draw("Objet du contrat", 60, y, 12, bold);
        y -= 20;
        for (const line of wrapLines(data.body, 92)) {
            draw(line, 60, y, 10);
            y -= 15;
        }

        const signatoryNames = [data.payerName, data.payeeName];
        SIGNATURE_ZONES.forEach((zone, index) => {
            const name = signatoryNames[index] || zone.label;
            draw(`Signature — ${name}`, zone.x, zone.y + 94, 9, bold);
            page.drawRectangle({
                x: zone.x + ZONE_BOX.offsetX,
                y: zone.y + ZONE_BOX.offsetY,
                width: ZONE_BOX.width,
                height: ZONE_BOX.height,
                color: ZONE_FILL,
                borderColor: ZONE_BORDER,
                borderWidth: 0.75,
            });
            page.drawLine({
                start: { x: zone.x, y: zone.y + 34 },
                end: { x: zone.x + ZONE_LINE_WIDTH, y: zone.y + 34 },
                thickness: 0.75,
                color: ZONE_LINE,
            });
        });

        return Buffer.from(await doc.save());
    }

    async stampSignature(
        pdf: Buffer,
        zoneIndex: number,
        stamp: SignatureStamp,
    ): Promise<Buffer> {
        const zone = SIGNATURE_ZONES[zoneIndex];
        if (!zone) throw new RangeError(`No signature zone ${zoneIndex}`);

        const doc = await PDFDocument.load(pdf);
        const page: PDFPage = doc.getPages()[0];
        const font = await doc.embedFont(StandardFonts.Helvetica);

        const drewImage = stamp.image
            ? await this.tryDrawSignatureImage(doc, page, zone, stamp.image)
            : false;
        if (!drewImage) {
            await this.drawTypedSignature(doc, page, zone, stamp.name);
        }

        page.drawText(stamp.name, {
            x: zone.x,
            y: zone.y + 20,
            size: 11,
            font,
            color: rgb(0, 0, 0.55),
        });
        page.drawText(`Signé le ${stamp.date}`, {
            x: zone.x,
            y: zone.y + 8,
            size: 8,
            font,
            color: rgb(0.3, 0.3, 0.3),
        });
        page.drawText(`#${stamp.hash}`, {
            x: zone.x,
            y: zone.y - 2,
            size: 7,
            font,
            color: rgb(0.5, 0.5, 0.5),
        });

        return Buffer.from(await doc.save());
    }

    // Stamps every zone of the current signer (multi-page, several zones per
    // signer). `signature` zones get the full mark plus a dated caption;
    // `initials` zones get a reduced mark (scaled image or cursive initials).
    async stampSignatureAtZones(
        pdf: Buffer,
        zones: SignatureZone[],
        stamp: SignatureStamp,
    ): Promise<Buffer> {
        if (zones.length === 0) {
            throw new RangeError("No signature zones to stamp");
        }
        const doc = await PDFDocument.load(pdf);
        const pages = doc.getPages();
        for (const zone of zones) {
            const page = pages[zone.page - 1];
            if (!page) throw new RangeError(`No page ${zone.page} in the PDF`);
            const size = page.getSize();
            const box = normalizedZoneToPdfBox(zone, size.width, size.height);
            if (zone.kind === SignatureZoneKind.INITIALS) {
                await this.stampInitialsInBox(doc, page, box, stamp);
            } else {
                await this.stampSignatureInBox(doc, page, box, stamp);
            }
        }
        return Buffer.from(await doc.save());
    }

    private async stampSignatureInBox(
        doc: PDFDocument,
        page: PDFPage,
        box: PdfBox,
        stamp: SignatureStamp,
    ): Promise<void> {
        const captionHeight = box.height >= 30 ? 10 : 0;
        const markBox: PdfBox = {
            ...box,
            y: box.y + captionHeight,
            height: box.height - captionHeight,
        };
        const drewImage = stamp.image
            ? await this.tryDrawImageInBox(doc, page, markBox, stamp.image)
            : false;
        if (!drewImage) {
            await this.drawCursiveTextInBox(doc, page, markBox, stamp.name);
        }
        if (captionHeight > 0) {
            await this.drawStampCaption(doc, page, box, stamp);
        }
    }

    private async stampInitialsInBox(
        doc: PDFDocument,
        page: PDFPage,
        box: PdfBox,
        stamp: SignatureStamp,
    ): Promise<void> {
        const drewImage = stamp.image
            ? await this.tryDrawImageInBox(doc, page, box, stamp.image)
            : false;
        if (!drewImage) {
            await this.drawCursiveTextInBox(
                doc,
                page,
                box,
                deriveInitials(stamp.name),
            );
        }
    }

    private async drawStampCaption(
        doc: PDFDocument,
        page: PDFPage,
        box: PdfBox,
        stamp: SignatureStamp,
    ): Promise<void> {
        const font = await doc.embedFont(StandardFonts.Helvetica);
        const caption = `Signé le ${stamp.date} — #${stamp.hash}`;
        const size = fitTextSize(font, caption, 7, box.width - 4, 4);
        page.drawText(caption, {
            x: box.x + 2,
            y: box.y + 2,
            size,
            font,
            color: rgb(0.35, 0.35, 0.35),
        });
    }

    private async tryDrawImageInBox(
        doc: PDFDocument,
        page: PDFPage,
        box: PdfBox,
        image: string,
    ): Promise<boolean> {
        let png: PDFImage;
        try {
            const base64 = image.replace(/^data:image\/png;base64,/, "");
            png = await doc.embedPng(Buffer.from(base64, "base64"));
        } catch {
            return false;
        }
        if (
            png.width < MIN_STAMP_IMAGE_WIDTH ||
            png.height < MIN_STAMP_IMAGE_HEIGHT
        ) {
            return false;
        }
        const scale = Math.min(
            box.width / png.width,
            box.height / png.height,
            1,
        );
        const width = png.width * scale;
        const height = png.height * scale;
        page.drawImage(png, {
            x: box.x + (box.width - width) / 2,
            y: box.y + (box.height - height) / 2,
            width,
            height,
        });
        return true;
    }

    private async drawCursiveTextInBox(
        doc: PDFDocument,
        page: PDFPage,
        box: PdfBox,
        text: string,
    ): Promise<void> {
        const italic = await doc.embedFont(StandardFonts.TimesRomanItalic);
        const size = Math.min(
            fitTextSize(italic, text, box.height * 0.65, box.width - 4, 4),
            box.height * 0.9,
        );
        page.drawText(text, {
            x: box.x + 2,
            y: box.y + (box.height - size) / 2,
            size,
            font: italic,
            color: INK_BLUE,
        });
    }

    // Draws the hand-drawn signature PNG above the signing line, preserving
    // its aspect ratio. Degenerate images (e.g. a stretched 1x1 pixel would
    // render as a solid box) are rejected so the typed fallback takes over.
    private async tryDrawSignatureImage(
        doc: PDFDocument,
        page: PDFPage,
        zone: { x: number; y: number },
        image: string,
    ): Promise<boolean> {
        let png: PDFImage;
        try {
            const base64 = image.replace(/^data:image\/png;base64,/, "");
            png = await doc.embedPng(Buffer.from(base64, "base64"));
        } catch {
            return false;
        }
        if (
            png.width < MIN_STAMP_IMAGE_WIDTH ||
            png.height < MIN_STAMP_IMAGE_HEIGHT
        ) {
            return false;
        }
        const maxWidth = 180;
        const maxHeight = 46;
        const scale = Math.min(maxWidth / png.width, maxHeight / png.height, 1);
        const width = png.width * scale;
        const height = png.height * scale;
        page.drawImage(png, {
            x: zone.x + (ZONE_LINE_WIDTH - width) / 2,
            y: zone.y + 37,
            width,
            height,
        });
        return true;
    }

    private async drawTypedSignature(
        doc: PDFDocument,
        page: PDFPage,
        zone: { x: number; y: number },
        name: string,
    ): Promise<void> {
        const italic = await doc.embedFont(StandardFonts.TimesRomanItalic);
        const size = fitTextSize(italic, name, 22, ZONE_LINE_WIDTH - 8);
        page.drawText(name, {
            x: zone.x + 4,
            y: zone.y + 40,
            size,
            font: italic,
            color: INK_BLUE,
        });
    }

    sha256(buffer: Buffer): string {
        return crypto.createHash("sha256").update(buffer).digest("hex");
    }
}
