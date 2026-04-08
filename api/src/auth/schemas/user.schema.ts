import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type UserDocument = User & Document;

export enum UserRole {
    RESIDENT = "resident",
    MODERATOR = "moderator",
    ADMIN = "admin",
}

@Schema({ timestamps: true })
export class User {
    @Prop({ required: true, unique: true, lowercase: true, trim: true })
    email: string;

    @Prop({ required: true })
    passwordHash: string;

    @Prop({ required: true })
    totpSecret: string;

    @Prop({ default: true })
    totpEnabled: boolean;

    @Prop({ enum: UserRole, default: UserRole.RESIDENT })
    role: UserRole;

    @Prop({ type: String, default: null })
    refreshTokenHash: string | null;

    @Prop({ type: Date, default: null })
    consentTimestamp: Date | null;
}

export const UserSchema = SchemaFactory.createForClass(User);
