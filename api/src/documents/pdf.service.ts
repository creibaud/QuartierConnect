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
