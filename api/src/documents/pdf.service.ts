import * as crypto from "crypto";
import { Injectable } from "@nestjs/common";
import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from "pdf-lib";

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
        draw(`Montant : ${data.pointsAmount} points`, 60, y);
        y -= 18;
        draw(`Date : ${data.date}`, 60, y);
        y -= 34;
        draw("Objet du contrat", 60, y, 12, bold);
        y -= 20;
        for (const line of wrapLines(data.body, 92)) {
            draw(line, 60, y, 10);
            y -= 15;
        }

        for (const z of SIGNATURE_ZONES) {
            draw(`À signer — ${z.label}`, z.x, z.y + 40, 10, bold);
            page.drawLine({
                start: { x: z.x, y: z.y + 34 },
                end: { x: z.x + 200, y: z.y + 34 },
                thickness: 0.75,
                color: rgb(0.4, 0.4, 0.4),
            });
        }

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

        const zoneWidth = 200;
        // Cover the "À signer — label" prompt: once signed, the transparent
        // signature PNG would otherwise let that prompt show through.
        page.drawRectangle({
            x: zone.x - 2,
            y: zone.y + 36,
            width: zoneWidth + 6,
            height: 16,
            color: rgb(1, 1, 1),
        });

        let drewImage = false;
        if (stamp.image) {
            try {
                const base64 = stamp.image.replace(
                    /^data:image\/png;base64,/,
                    "",
                );
                const png = await doc.embedPng(Buffer.from(base64, "base64"));
                // Fit within the signing box, preserving the drawn signature's
                // aspect ratio (the old fixed 120x48 squished it), then centre it.
                const maxWidth = 180;
                const maxHeight = 46;
                const scale = Math.min(
                    maxWidth / png.width,
                    maxHeight / png.height,
                    1,
                );
                const width = png.width * scale;
                const height = png.height * scale;
                page.drawImage(png, {
                    x: zone.x + (zoneWidth - width) / 2,
                    y: zone.y + 37,
                    width,
                    height,
                });
                drewImage = true;
            } catch {
                // best-effort: fall back to the typed signature below
            }
        }

        // No drawn signature → render the name as a typed signature above the
        // line (ink blue) so the signing area is never an empty box.
        if (!drewImage) {
            page.drawText(stamp.name, {
                x: zone.x,
                y: zone.y + 44,
                size: 18,
                font,
                color: rgb(0.09, 0.15, 0.42),
            });
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

    sha256(buffer: Buffer): string {
        return crypto.createHash("sha256").update(buffer).digest("hex");
    }
}
