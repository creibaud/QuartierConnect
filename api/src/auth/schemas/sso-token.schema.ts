import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type SsoTokenDocument = SsoToken & Document;

export enum SsoSurface {
    JAVA_DESKTOP = "java-desktop",
    WEB_ADMIN = "web-admin",
}

@Schema()
export class SsoToken {
    @Prop({ required: true, type: String })
    userId: string;

    @Prop({ required: true, unique: true })
    token: string;

    @Prop({ required: true, enum: SsoSurface })
    surface: SsoSurface;

    @Prop({ required: true })
    expiresAt: Date;

    @Prop({ type: String, default: null })
    state: string | null;

    @Prop({ type: Date, default: null })
    usedAt: Date | null;
}

export const SsoTokenSchema = SchemaFactory.createForClass(SsoToken);
SsoTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
