import { describe, expect, it } from "vitest";
import type { SignatureZone } from "@workspace/shared/lib/types";
import {
    DEFAULT_ZONE_SIZES,
    MIN_ZONE_SIZE,
    moveZone,
    placeZone,
    resizeZone,
    signersMissingZones,
    signerZoneColor,
    SIGNER_ZONE_COLORS,
} from "../signature-zone-utils";

function zone(overrides: Partial<SignatureZone> = {}): SignatureZone {
    return {
        page: 1,
        x: 0.4,
        y: 0.4,
        w: 0.2,
        h: 0.1,
        signerId: "u1",
        kind: "signature",
        ...overrides,
    };
}

describe("placeZone", () => {
    it("centers the default-sized zone on the drop point", () => {
        const placed = placeZone({
            page: 2,
            signerId: "u1",
            kind: "signature",
            centerX: 0.5,
            centerY: 0.5,
        });
        const { w, h } = DEFAULT_ZONE_SIZES.signature;
        expect(placed).toEqual({
            page: 2,
            x: 0.5 - w / 2,
            y: 0.5 - h / 2,
            w,
            h,
            signerId: "u1",
            kind: "signature",
        });
    });

    it("clamps a drop near the bottom-right corner inside the page", () => {
        const placed = placeZone({
            page: 1,
            signerId: "u1",
            kind: "initials",
            centerX: 1,
            centerY: 1,
        });
        expect(placed.x + placed.w).toBeLessThanOrEqual(1);
        expect(placed.y + placed.h).toBeLessThanOrEqual(1);
    });

    it("clamps a drop near the top-left corner to the page origin", () => {
        const placed = placeZone({
            page: 1,
            signerId: "u1",
            kind: "signature",
            centerX: 0,
            centerY: 0,
        });
        expect(placed.x).toBe(0);
        expect(placed.y).toBe(0);
    });
});

describe("moveZone", () => {
    it("translates by normalized deltas", () => {
        const moved = moveZone(zone(), 0.1, -0.2);
        expect(moved.x).toBeCloseTo(0.5);
        expect(moved.y).toBeCloseTo(0.2);
    });

    it("keeps the zone fully inside the page", () => {
        const moved = moveZone(zone(), 5, 5);
        expect(moved.x).toBeCloseTo(1 - moved.w);
        expect(moved.y).toBeCloseTo(1 - moved.h);
    });
});

describe("resizeZone", () => {
    it("applies the requested size", () => {
        const resized = resizeZone(zone(), 0.3, 0.2);
        expect(resized.w).toBeCloseTo(0.3);
        expect(resized.h).toBeCloseTo(0.2);
    });

    it("enforces the minimum size", () => {
        const resized = resizeZone(zone(), 0, 0);
        expect(resized.w).toBe(MIN_ZONE_SIZE.w);
        expect(resized.h).toBe(MIN_ZONE_SIZE.h);
    });

    it("never grows past the page edges", () => {
        const resized = resizeZone(zone({ x: 0.9, y: 0.95 }), 1, 1);
        expect(resized.x + resized.w).toBeLessThanOrEqual(1);
        expect(resized.y + resized.h).toBeLessThanOrEqual(1);
    });
});

describe("signersMissingZones", () => {
    it("lists signers without any zone", () => {
        const zones = [zone({ signerId: "u1" })];
        expect(signersMissingZones(["u1", "u2"], zones)).toEqual(["u2"]);
    });

    it("is empty once every signer has a zone", () => {
        const zones = [
            zone({ signerId: "u1" }),
            zone({ signerId: "u2", kind: "initials" }),
        ];
        expect(signersMissingZones(["u1", "u2"], zones)).toEqual([]);
    });
});

describe("signerZoneColor", () => {
    it("cycles through the palette", () => {
        expect(signerZoneColor(0)).toBe(SIGNER_ZONE_COLORS[0]);
        expect(signerZoneColor(SIGNER_ZONE_COLORS.length)).toBe(
            SIGNER_ZONE_COLORS[0],
        );
    });
});
