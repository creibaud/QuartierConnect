import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

@Schema({ _id: false })
export class GeoPoint {
    @Prop({ type: String, enum: ["Point"], default: "Point" })
    type: "Point";

    @Prop({ type: [Number], required: true })
    coordinates: [number, number];
}

export const GeoPointSchema = SchemaFactory.createForClass(GeoPoint);
