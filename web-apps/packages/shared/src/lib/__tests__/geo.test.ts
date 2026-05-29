import { describe, it, expect } from "vitest";
import { centroidOf, pointToLatLng, latLngToPoint } from "../geo";
import type { GeoJsonPolygon } from "../types";

describe("centroidOf", () => {
    it("computes centroid of a unit square", () => {
        const sq: GeoJsonPolygon = {
            type: "Polygon",
            coordinates: [
                [
                    [0, 0],
                    [1, 0],
                    [1, 1],
                    [0, 1],
                    [0, 0],
                ],
            ],
        };
        const [lat, lng] = centroidOf(sq);
        expect(lat).toBeCloseTo(0.4, 1);
        expect(lng).toBeCloseTo(0.4, 1);
    });
});

describe("pointToLatLng / latLngToPoint", () => {
    it("flips GeoJSON [lng, lat] to Leaflet [lat, lng]", () => {
        expect(pointToLatLng({ type: "Point", coordinates: [2.35, 48.85] })).toEqual([
            48.85, 2.35,
        ]);
    });

    it("flips Leaflet [lat, lng] to GeoJSON [lng, lat]", () => {
        expect(latLngToPoint(48.85, 2.35)).toEqual({
            type: "Point",
            coordinates: [2.35, 48.85],
        });
    });
});
