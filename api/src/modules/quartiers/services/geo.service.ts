import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ObjectId } from "mongodb";
import {
    QUARTIERS_GEO_COLLECTION,
    type QuartierGeoDocument,
} from "src/database/mongodb/models/quartier-geo.model";
import type { MongoDatabase } from "src/database/mongodb/mongodb.type";

/**
 * GeoService handles all geographic/geospatial operations for quartiers.
 * Separates geo logic from CRUD and membership concerns.
 */
@Injectable()
export class GeoService {
    private readonly logger = new Logger(GeoService.name);

    constructor(private readonly mongo: MongoDatabase) {}

    /**
     * Verify that a new geometry doesn't intersect with existing quartier boundaries.
     * Uses MongoDB geospatial queries.
     */
    async assertNoGeoIntersection(geojson: Record<string, unknown>) {
        if (!geojson || !geojson.geometry) {
            throw new BadRequestException("Invalid GeoJSON geometry");
        }

        const intersecting = await this.mongo
            .collection<QuartierGeoDocument>(QUARTIERS_GEO_COLLECTION)
            .findOne({
                geojson: {
                    $geoIntersects: {
                        $geometry: geojson.geometry as Record<string, unknown>,
                    },
                },
            });

        if (intersecting) {
            throw new BadRequestException(
                "Quartier geometry intersects with existing quartier",
            );
        }
    }

    /**
     * Create a geo document and link it to a quartier in PostgreSQL.
     */
    async createGeoDocument(
        quartierId: string,
        name: string,
        description: string,
        geojson: Record<string, unknown>,
        adminUserId: string,
    ): Promise<{ mongoGeoId: string }> {
        const geoDoc: QuartierGeoDocument = {
            quartierId,
            name,
            description,
            geojson: geojson as QuartierGeoDocument["geojson"],
            adminUserId,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const { insertedId } = await this.mongo
            .collection<QuartierGeoDocument>(QUARTIERS_GEO_COLLECTION)
            .insertOne(geoDoc);

        this.logger.log(`Geo document created for quartier ${quartierId}`);

        return { mongoGeoId: insertedId.toHexString() };
    }

    /**
     * Find geo documents near a location (useful for discovery).
     */
    async findNearby(
        longitude: number,
        latitude: number,
        maxDistanceMeters = 5000,
    ): Promise<QuartierGeoDocument[]> {
        return this.mongo
            .collection<QuartierGeoDocument>(QUARTIERS_GEO_COLLECTION)
            .find({
                geojson: {
                    $near: {
                        $geometry: {
                            type: "Point",
                            coordinates: [longitude, latitude],
                        },
                        $maxDistance: maxDistanceMeters,
                    },
                },
            })
            .toArray();
    }

    /**
     * Delete geo document
     */
    async deleteGeoDocument(mongoGeoId: string): Promise<void> {
        await this.mongo
            .collection<QuartierGeoDocument>(QUARTIERS_GEO_COLLECTION)
            .deleteOne({ _id: new ObjectId(mongoGeoId) });

        this.logger.log(`Geo document deleted: ${mongoGeoId}`);
    }
}
