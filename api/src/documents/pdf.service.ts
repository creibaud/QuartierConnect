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
): number {
    const width = font.widthOfTextAtSize(text, preferredSize);
    if (width <= maxWidth) return preferredSize;
    return Math.max(9, (preferredSize * maxWidth) / width);
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
