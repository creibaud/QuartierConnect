import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type ContractPdfAction = "generated" | "signed" | "viewed";

export interface ContractAuditEntry {
    action: ContractPdfAction;
    userId: string;
    at: Date;
    sha256?: string;
    fileId?: string;
}

export type ContractPdfDocumentDoc = HydratedDocument<ContractPdfDocument>;

@Schema({ timestamps: true, collection: "documents" })
export class ContractPdfDocument {
    @Prop({ required: true, unique: true, index: true })
    contractId: string;

    @Prop({ type: String, default: null })
    pdfFileId: string | null;

    @Prop({ type: String, default: null })
    sha256Hash: string | null;

    @Prop({ type: [Object], default: [] })
    auditLog: ContractAuditEntry[];
}

export const ContractPdfDocumentSchema =
    SchemaFactory.createForClass(ContractPdfDocument);
