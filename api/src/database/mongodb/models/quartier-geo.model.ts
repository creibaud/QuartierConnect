import type { ObjectId } from "mongodb";
import type { GeoJsonMultiPolygon, GeoJsonPolygon } from "./geojson.model";

export const QUARTIERS_GEO_COLLECTION = "quartiers_geo";

export type QuartierGeoDocument = {
    _id?: ObjectId;
    quartierId: string; // PostgreSQL quartiers.id
    name: string;
    description?: string;
    geojson: GeoJsonPolygon | GeoJsonMultiPolygon;
    adminUserId: string;
    createdAt: Date;
    updatedAt: Date;
};
