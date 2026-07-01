import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type ContractDocument = Contract & Document;

export enum ContractStatus {
    DRAFT = "draft",
    PARTIAL = "partial",
    FULLY_SIGNED = "fully_signed",
    CANCELLED = "cancelled",
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
}

export const ContractSchema = SchemaFactory.createForClass(Contract);
