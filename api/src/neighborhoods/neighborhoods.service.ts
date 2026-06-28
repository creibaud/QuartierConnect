import { ConflictException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
    GeoJsonPolygon,
    Neighborhood,
    NeighborhoodDocument,
} from "./schemas/neighborhood.schema";

@Injectable()
export class NeighborhoodsService {
    constructor(
        @InjectModel(Neighborhood.name)
        private readonly neighborhoodModel: Model<NeighborhoodDocument>,
    ) {}

    count(): Promise<number> {
        return this.neighborhoodModel.countDocuments();
    }

    findOverlapping(geometry: GeoJsonPolygon): Promise<NeighborhoodDocument[]> {
        return this.neighborhoodModel
            .find({
                geometry: {
                    $geoIntersects: { $geometry: geometry },
                },
            })
            .exec();
    }

    async assertNoOverlap(
        geometry: GeoJsonPolygon,
        excludeId?: string,
    ): Promise<void> {
        const overlapping = await this.findOverlapping(geometry);
        const conflicts = overlapping.filter(
            (n) => n._id.toString() !== excludeId,
        );
        if (conflicts.length > 0) {
            throw new ConflictException(
                `The polygon overlaps ${conflicts.length} existing neighborhood(s): ${conflicts.map((n) => n.name).join(", ")}`,
            );
        }
    }
}
