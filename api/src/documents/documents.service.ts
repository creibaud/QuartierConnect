import {
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
} from "@nestjs/common";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import { GridFSBucket, GridFSFile, ObjectId } from "mongodb";
import { Connection, Model } from "mongoose";
import {
    AuditAction,
    DocumentAudit,
    DocumentAuditLog,
} from "./schemas/document-audit.schema";

export interface UploadedDocument {
    fileId: string;
    fileName: string;
    contentType: string;
    size: number;
    uploadedBy: string;
    uploadedAt: Date;
}

@Injectable()
export class DocumentsService {
    private readonly bucket: GridFSBucket;
    private readonly logger = new Logger(DocumentsService.name);

    constructor(
        @InjectModel(DocumentAudit.name)
        private readonly auditModel: Model<DocumentAuditLog>,
        @InjectConnection() private readonly connection: Connection,
    ) {
        this.bucket = new GridFSBucket(this.connection.db as any, {
            bucketName: "documents",
        });
    }

    async upload(
        file: Express.Multer.File,
        userId: string,
        neighborhoodId?: string,
    ): Promise<UploadedDocument> {
        const fileId = new ObjectId();

        await new Promise<void>((resolve) => {
            const stream = this.bucket.openUploadStreamWithId(
                fileId,
                file.originalname,
                {
                    metadata: {
                        uploadedBy: userId,
                        neighborhoodId: neighborhoodId ?? null,
                        contentType: file.mimetype,
                    },
                },
            );
            stream.end(file.buffer, () => resolve());
        });

        await this.auditModel.create({
            fileId: fileId.toHexString(),
            userId,
            action: AuditAction.UPLOAD,
            fileName: file.originalname,
            metadata: { contentType: file.mimetype, size: file.size },
        });

        return {
            fileId: fileId.toHexString(),
            fileName: file.originalname,
            contentType: file.mimetype,
            size: file.size,
            uploadedBy: userId,
            uploadedAt: new Date(),
        };
    }

    async getFileStream(
        fileId: string,
        userId: string,
    ): Promise<{
        stream: NodeJS.ReadableStream;
        fileName: string;
        contentType: string;
    }> {
        const files = await this.bucket
            .find({ _id: new ObjectId(fileId) })
            .toArray();

        if (!files.length) throw new NotFoundException("File not found");

        const file = files[0] as GridFSFile & {
            contentType?: string;
            metadata?: { uploadedBy?: string };
        };

        if (file.metadata?.uploadedBy && file.metadata.uploadedBy !== userId) {
            throw new ForbiddenException("Cannot download this file");
        }

        await this.auditModel.create({
            fileId,
            userId,
            action: AuditAction.DOWNLOAD,
            fileName: file.filename,
        });

        const stream = this.bucket.openDownloadStream(new ObjectId(fileId));
        return {
            stream,
            fileName: file.filename,
            contentType: file.contentType ?? "application/octet-stream",
        };
    }

    async softDelete(fileId: string, userId: string, userRole: string) {
        const files = await this.bucket
            .find({ _id: new ObjectId(fileId) })
            .toArray();

        if (!files.length) throw new NotFoundException("File not found");

        const file = files[0] as GridFSFile & {
            metadata?: { uploadedBy?: string };
        };
        const uploadedBy = file.metadata?.uploadedBy;

        if (uploadedBy !== userId && userRole !== "admin") {
            throw new ForbiddenException("Cannot delete this file");
        }

        await this.auditModel.create({
            fileId,
            userId,
            action: AuditAction.DELETE,
            fileName: file.filename,
        });

        await this.bucket.delete(new ObjectId(fileId));
        return { success: true };
    }

    getAuditLog(fileId: string) {
        return this.auditModel.find({ fileId }).sort({ createdAt: 1 }).exec();
    }

    getMyDocuments(userId: string) {
        return this.bucket.find({ "metadata.uploadedBy": userId }).toArray();
    }
}
