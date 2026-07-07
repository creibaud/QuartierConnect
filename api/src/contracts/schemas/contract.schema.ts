import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type ContractDocument = Contract & Document;

export enum ContractStatus {
    DRAFT = "draft",
    PARTIAL = "partial",
    FULLY_SIGNED = "fully_signed",
    CANCELLED = "cancelled",
}

export enum ContractSource {
    GENERATED = "generated",
    IMPORTED = "imported",
}

export enum SignatureZoneKind {
    SIGNATURE = "signature",
    INITIALS = "initials",
}

// Normalized (0..1) rectangle with a top-left origin; PdfService flips to
// pdf-lib's bottom-left origin when stamping.
export interface SignatureZone {
    page: number;
    x: number;
    y: number;
    w: number;
    h: number;
    signerId: string;
    kind: SignatureZoneKind;
}

@Schema({ timestamps: true })
export class Contract {
    @Prop({ required: true })
    title: string;

    @Prop({ required: true })
    content: string;

    @Prop({ required: true })
    createdBy: string;

    @Prop({ type: [String], default: [] })
    signatories: string[];

    @Prop({
        required: true,
        enum: ContractStatus,
        default: ContractStatus.DRAFT,
    })
    status: ContractStatus;

    @Prop({ type: String, default: null })
    contentHash: string | null;

    @Prop({ type: Date, default: null })
    signedAt: Date | null;

    @Prop({ type: [Object], default: [] })
    signatures: Array<{
        userId: string;
        signedAt: Date;
        hash: string;
    }>;

    @Prop({ type: String, default: null })
    serviceId: string | null;

    @Prop({ type: String, default: null })
    bookingId: string | null;

    @Prop({ type: Number, default: null })
    pointsAmount: number | null;

    @Prop({ type: String, default: null })
    pdfFileId: string | null;

    @Prop({
        type: String,
        enum: ContractSource,
        default: ContractSource.GENERATED,
    })
    source: ContractSource;

    @Prop({ type: [Object], default: undefined })
    zones?: SignatureZone[];
}

export const ContractSchema = SchemaFactory.createForClass(Contract);
