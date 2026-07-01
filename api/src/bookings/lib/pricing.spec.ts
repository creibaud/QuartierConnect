import { computeBasePoints, computeServicePrice } from "./pricing";

describe("computeBasePoints", () => {
    it("returns 1 for a quick action (<30 min)", () => {
        expect(computeBasePoints(20)).toBe(1);
    });
    it("returns 1 at 30 min and 2 at one hour", () => {
        expect(computeBasePoints(30)).toBe(1);
        expect(computeBasePoints(60)).toBe(2);
    });
    it("scales with duration (90 min → 3, 120 min → 4)", () => {
        expect(computeBasePoints(90)).toBe(3);
        expect(computeBasePoints(120)).toBe(4);
    });
    it("never returns less than 1", () => {
        expect(computeBasePoints(0)).toBe(1);
    });
});

describe("computeServicePrice", () => {
    it("derives base × multiplier, rounded up", () => {
        expect(
            computeServicePrice({ durationMinutes: 60, pointsMultiplier: 1.5 }),
        ).toBe(3); // ceil(2 * 1.5)
    });
    it("honours an explicit override over the derived value", () => {
        expect(
            computeServicePrice({
                durationMinutes: 60,
                pointsMultiplier: 2,
                override: 7,
            }),
        ).toBe(7);
    });
    it("defaults multiplier to 1 when absent", () => {
        expect(computeServicePrice({ durationMinutes: 120 })).toBe(4);
    });
});
