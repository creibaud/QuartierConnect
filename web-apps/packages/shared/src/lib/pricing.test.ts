import { describe, expect, it } from "vitest";
import { computeBasePoints, computeServicePoints } from "./pricing";

describe("computeBasePoints", () => {
    it("charges one point below thirty minutes", () => {
        expect(computeBasePoints(20)).toBe(1);
    });
    it("charges one point per half hour", () => {
        expect(computeBasePoints(30)).toBe(1);
        expect(computeBasePoints(60)).toBe(2);
        expect(computeBasePoints(90)).toBe(3);
    });
    it("charges one point when the duration is missing", () => {
        expect(computeBasePoints(0)).toBe(1);
    });
});

describe("computeServicePoints", () => {
    it("rounds the multiplied price up", () => {
        expect(
            computeServicePoints({ duration: 60, pointsMultiplier: 1.5 }),
        ).toBe(3);
    });
    it("defaults the multiplier to one", () => {
        expect(computeServicePoints({ duration: 60 })).toBe(2);
    });
    it("prefers an explicit points amount", () => {
        expect(
            computeServicePoints({ duration: 60, pointsAmount: 5 }),
        ).toBe(5);
    });
});
