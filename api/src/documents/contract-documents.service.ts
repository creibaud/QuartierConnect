import { Injectable } from "@nestjs/common";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import { GridFSBucket, ObjectId } from "mongodb";
import { Connection, Model } from "mongoose";
import { PdfService } from "./pdf.service";
import {
    ContractAuditEntry,
    ContractPdfDocument,
    ContractPdfDocumentDoc,
    ContractPdfStoreAction,
} from "./schemas/document.schema";

// Collapse "viewed" audit entries logged within this window into one.
const VIEW_DEDUP_WINDOW_MS = 10_000;

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

    private async deleteFromGridFs(fileId: string): Promise<void> {
        await this.bucket.delete(new ObjectId(fileId));
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
        action: ContractPdfStoreAction,
        userId: string,
    ): Promise<{ fileId: string; sha256: string }> {
        const existing = await this.docModel.findOne({ contractId });
        const supersededFileId = existing?.pdfFileId;
        const originalFileId = existing?.auditLog?.[0]?.fileId;

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

        // Reclaim the superseded intermediate file, but keep the original (its
        // bytes may be legally required) and, of course, the current one. The
        // audit log keeps every version's hash regardless.
        if (
            supersededFileId &&
            supersededFileId !== fileId &&
            supersededFileId !== originalFileId
        ) {
            await this.deleteFromGridFs(supersededFileId).catch(
                () => undefined,
            );
        }
        return { fileId, sha256 };
    }

    // Remove a contract's PDF metadata and every GridFS file it references —
    // used to roll back a half-written import.
    async purgeContract(contractId: string): Promise<void> {
        const doc = await this.docModel.findOne({ contractId });
        if (!doc) return;
        const fileIds = new Set<string>();
        if (doc.pdfFileId) fileIds.add(doc.pdfFileId);
        for (const entry of doc.auditLog ?? []) {
            if (entry.fileId) fileIds.add(entry.fileId);
        }
        for (const fileId of fileIds) {
            await this.deleteFromGridFs(fileId).catch(() => undefined);
        }
        await this.docModel.deleteOne({ contractId });
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
        // Atomic dedup: skip when this user already logged a view in the window.
        const dedupCutoff = new Date(Date.now() - VIEW_DEDUP_WINDOW_MS);
        await this.docModel.updateOne(
            {
                contractId,
                auditLog: {
                    $not: {
                        $elemMatch: {
                            action: "viewed",
                            userId,
                            at: { $gte: dedupCutoff },
                        },
                    },
                },
            },
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
