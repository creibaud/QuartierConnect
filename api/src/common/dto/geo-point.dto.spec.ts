import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { GeoPointDto } from "./geo-point.dto";

function errorsFor(coordinates: unknown) {
    const dto = plainToInstance(GeoPointDto, {
        type: "Point",
        coordinates,
    });
    return validateSync(dto);
}

describe("GeoPointDto", () => {
    it("accepts in-range [lng, lat]", () => {
        expect(errorsFor([2.3522, 48.8566])).toHaveLength(0);
    });

    it("rejects an out-of-range longitude", () => {
        expect(errorsFor([200, 48]).length).toBeGreaterThan(0);
    });

    it("rejects an out-of-range latitude", () => {
        expect(errorsFor([2, 999]).length).toBeGreaterThan(0);
    });

    it("rejects swapped [lat, lng] that lands out of range", () => {
        // 48.8566 as longitude is valid, but 148 as latitude is not.
        expect(errorsFor([48.8566, 148]).length).toBeGreaterThan(0);
    });
});
