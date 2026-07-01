import { Injectable } from "@nestjs/common";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import { GridFSBucket, ObjectId } from "mongodb";
import { Connection, Model } from "mongoose";
import { PdfService } from "./pdf.service";
import {
    ContractAuditEntry,
    ContractPdfDocument,
    ContractPdfDocumentDoc,
} from "./schemas/document.schema";

@Injectable()
export class ContractDocumentsService {
    private bucketInstance: GridFSBucket | undefined;

    constructor(
        @InjectModel(ContractPdfDocument.name)
        private readonly docModel: Model<ContractPdfDocumentDoc>,
        @InjectConnection() private readonly connection: Connection,
        private readonly pdfService: PdfService,
    ) {}

    private get bucket(): GridFSBucket {
        this.bucketInstance ??= new GridFSBucket(this.connection.db as never, {
            bucketName: "pdfs",
        });
        return this.bucketInstance;
    }

    private writeToGridFs(contractId: string, buffer: Buffer): Promise<string> {
        const fileId = new ObjectId();
        return new Promise<string>((resolve, reject) => {
            const stream = this.bucket.openUploadStreamWithId(
                fileId,
                `contract-${contractId}.pdf`,
                { metadata: { contractId, contentType: "application/pdf" } },
            );
            stream.on("error", reject);
            stream.end(buffer, () => resolve(fileId.toHexString()));
        });
    }

    private readFromGridFs(fileId: string): Promise<Buffer> {
        return new Promise<Buffer>((resolve, reject) => {
            const chunks: Buffer[] = [];
            this.bucket
                .openDownloadStream(new ObjectId(fileId))
                .on("data", (chunk: Buffer) => chunks.push(chunk))
                .on("error", reject)
                .on("end", () => resolve(Buffer.concat(chunks)));
        });
    }

    async storePdf(
        contractId: string,
        buffer: Buffer,
        action: "generated" | "signed",
        userId: string,
    ): Promise<{ fileId: string; sha256: string }> {
        const fileId = await this.writeToGridFs(contractId, buffer);
        const sha256 = this.pdfService.sha256(buffer);
        const entry: ContractAuditEntry = {
            action,
            userId,
            at: new Date(),
            sha256,
            fileId,
        };
        await this.docModel.updateOne(
            { contractId },
            {
                $set: { pdfFileId: fileId, sha256Hash: sha256 },
                $push: { auditLog: entry },
            },
            { upsert: true },
        );
        return { fileId, sha256 };
    }

    async getCurrentPdf(contractId: string): Promise<Buffer | null> {
        const doc = await this.docModel.findOne({ contractId });
        if (!doc?.pdfFileId) return null;
        return this.readFromGridFs(doc.pdfFileId);
    }

    async getPdfStream(
        contractId: string,
        userId: string,
    ): Promise<{ stream: NodeJS.ReadableStream; fileName: string } | null> {
        const doc = await this.docModel.findOne({ contractId });
        if (!doc?.pdfFileId) return null;
        const entry: ContractAuditEntry = {
            action: "viewed",
            userId,
            at: new Date(),
        };
        await this.docModel.updateOne(
            { contractId },
            { $push: { auditLog: entry } },
        );
        return {
            stream: this.bucket.openDownloadStream(new ObjectId(doc.pdfFileId)),
            fileName: `contract-${contractId}.pdf`,
        };
    }

    async getAudit(contractId: string): Promise<ContractAuditEntry[]> {
        const doc = await this.docModel.findOne({ contractId });
        return doc?.auditLog ?? [];
    }
}
