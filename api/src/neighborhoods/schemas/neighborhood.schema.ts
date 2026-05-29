import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, SchemaTypes } from "mongoose";

export type NeighborhoodDocument = HydratedDocument<Neighborhood>;

export interface GeoJsonPolygon {
    type: "Polygon";
    coordinates: number[][][];
}

@Schema({ timestamps: true })
export class Neighborhood {
    @Prop({ required: true })
    name: string;

    @Prop({ required: true })
    city: string;

    @Prop()
    description: string;

    @Prop({ type: SchemaTypes.Mixed })
    geometry?: GeoJsonPolygon;
}

export const NeighborhoodSchema = SchemaFactory.createForClass(Neighborhood);
NeighborhoodSchema.index({ geometry: "2dsphere" }, { sparse: true });
