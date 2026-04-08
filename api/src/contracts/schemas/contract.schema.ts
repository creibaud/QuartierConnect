import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type ContractDocument = Contract & Document;

export enum ContractStatus {
    DRAFT = "draft",
    PENDING_SIGNATURE = "pending_signature",
    SIGNED = "signed",
    REJECTED = "rejected",
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
}

export const ContractSchema = SchemaFactory.createForClass(Contract);
