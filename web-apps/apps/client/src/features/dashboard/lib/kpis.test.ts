import { describe, expect, it } from "vitest";
import {
    countOpenIncidents,
    countOpenVotes,
    countUpcomingEvents,
    selectOpenVotes,
    selectUpcomingEvents,
} from "./kpis";

const NOW = 1_000_000;

describe("selectUpcomingEvents", () => {
    const events = [
        { date: NOW - 10 }, // past
        { date: NOW + 30 },
        { date: NOW + 10 },
    ];
    it("keeps future events, sorted ascending, capped to the limit", () => {
        expect(selectUpcomingEvents(events, NOW, 1)).toEqual([{ date: NOW + 10 }]);
        expect(selectUpcomingEvents(events, NOW)).toEqual([{ date: NOW + 10 }, { date: NOW + 30 }]);
    });
});

describe("counts", () => {
    it("counts open votes and incidents by status", () => {
        const votes = [{ status: "open" }, { status: "closed" }, { status: "open" }];
        expect(countOpenVotes(votes)).toBe(2);
        expect(selectOpenVotes(votes)).toHaveLength(2);
        const incidents = [{ status: "open" }, { status: "resolved" }, { status: "in_progress" }];
        expect(countOpenIncidents(incidents)).toBe(1);
    });
    it("counts only future events", () => {
        expect(countUpcomingEvents([{ date: NOW + 1 }, { date: NOW - 1 }], NOW)).toBe(1);
    });
});
