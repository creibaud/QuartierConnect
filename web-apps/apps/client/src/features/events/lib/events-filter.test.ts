import { describe, expect, it } from "vitest";
import type { Event } from "@workspace/shared/lib/types";
import { eventsByDateAsc, eventsOnDate, upcomingEvents } from "./events-filter";

function event(id: string, date: string): Event {
    return {
        _id: id,
        title: id,
        description: "",
        category: "other",
        date,
        neighborhoodId: "n1",
    };
}

const jan = event("jan", "2026-01-10T12:00:00.000Z");
const jun = event("jun", "2026-06-10T12:00:00.000Z");
const dec = event("dec", "2026-12-10T12:00:00.000Z");

describe("eventsByDateAsc", () => {
    it("sorts ascending without mutating the input", () => {
        const input = [dec, jan, jun];
        const sorted = eventsByDateAsc(input);
        expect(sorted.map((e) => e._id)).toEqual(["jan", "jun", "dec"]);
        expect(input[0]).toBe(dec);
    });
});

describe("upcomingEvents", () => {
    it("keeps only events at or after the reference date, sorted ascending", () => {
        const from = new Date("2026-05-01T00:00:00.000Z");
        expect(upcomingEvents([dec, jan, jun], from).map((e) => e._id)).toEqual([
            "jun",
            "dec",
        ]);
    });
});

describe("eventsOnDate", () => {
    it("matches events on the same calendar day", () => {
        const day = new Date("2026-06-10T00:00:00.000Z");
        expect(eventsOnDate([jan, jun, dec], day).map((e) => e._id)).toEqual([
            "jun",
        ]);
    });
});
