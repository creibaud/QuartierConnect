import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type DocumentAuditLog = DocumentAudit & Document;

export enum AuditAction {
    UPLOAD = "upload",
    DOWNLOAD = "download",
    DELETE = "delete",
    ACCESS = "access",
}

@Schema({ timestamps: true })
export class DocumentAudit {
    @Prop({ required: true })
    fileId: string;

    @Prop({ required: true })
    userId: string;

    @Prop({ required: true, enum: AuditAction })
    action: AuditAction;

    @Prop({ type: String, default: null })
    fileName: string | null;

    @Prop({ type: Object, default: null })
    metadata: Record<string, unknown> | null;
}

export const DocumentAuditSchema = SchemaFactory.createForClass(DocumentAudit);
DocumentAuditSchema.index({ fileId: 1 });
DocumentAuditSchema.index({ userId: 1, createdAt: -1 });
