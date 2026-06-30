import { describe, expect, it } from "vitest";
import { entitiesToMarkers } from "./community-markers";

describe("entitiesToMarkers", () => {
    const base = {
        services: [
            { _id: "s1", title: "Offer", direction: "offer", location: { coordinates: [2.35, 48.85] as [number, number] } },
            { _id: "s2", title: "Req", direction: "request", location: { coordinates: [2.36, 48.86] as [number, number] } },
            { _id: "s3", title: "NoLoc", direction: "offer", location: null },
        ],
        events: [{ _id: "e1", title: "Fete", location: { coordinates: [2.30, 48.80] as [number, number] } }],
        incidents: [
            { id: "i1", title: "Light", category: "neighborhood", lat: 48.87, lng: 2.37 },
            { id: "i2", title: "Bug", category: "bug", lat: 48.88, lng: 2.38 },
            { id: "i3", title: "NoCoord", category: "neighborhood", lat: null, lng: null },
        ],
        home: { lat: 48.90, lng: 2.40 },
    };

    it("maps services by direction and swaps coordinates to [lat,lng]", () => {
        const m = entitiesToMarkers(base);
        expect(m.find((x) => x.key === "service:s1")).toMatchObject({ variant: "serviceOffer", position: [48.85, 2.35] });
        expect(m.find((x) => x.key === "service:s2")?.variant).toBe("serviceRequest");
    });

    it("drops entries without coordinates and non-neighborhood incidents", () => {
        const m = entitiesToMarkers(base);
        expect(m.some((x) => x.key === "service:s3")).toBe(false);
        expect(m.some((x) => x.key === "incident:i2")).toBe(false);
        expect(m.some((x) => x.key === "incident:i3")).toBe(false);
    });

    it("includes one home marker", () => {
        const m = entitiesToMarkers(base);
        expect(m.filter((x) => x.variant === "home")).toHaveLength(1);
    });
});
