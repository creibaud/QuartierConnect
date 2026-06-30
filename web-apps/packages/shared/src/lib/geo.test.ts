import { describe, expect, it } from "vitest";
import { pointInPolygon } from "./geo";
import type { GeoJsonPolygon } from "./types";

// Unit square [0,0]–[2,2] (coordinates are [lng, lat])
const square: GeoJsonPolygon = {
    type: "Polygon",
    coordinates: [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]],
};

describe("pointInPolygon", () => {
    it("is true for an interior point", () => {
        expect(pointInPolygon(1, 1, square)).toBe(true);
    });
    it("is false for an exterior point", () => {
        expect(pointInPolygon(3, 3, square)).toBe(false);
    });
    it("is false for a degenerate polygon", () => {
        expect(pointInPolygon(1, 1, { type: "Polygon", coordinates: [[]] })).toBe(false);
    });
});
