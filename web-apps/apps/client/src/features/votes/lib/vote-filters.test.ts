import { describe, expect, it } from "vitest";
import type { CommunityVote } from "./vote.types";
import { compareByEndsAt, hasVotedOn, isVoteClosed } from "./vote-filters";

function vote(overrides: Partial<CommunityVote> = {}): CommunityVote {
    return {
        _id: "v1",
        title: "Vote",
        voteType: "single_choice",
        options: [],
        status: "open",
        endsAt: "2026-06-01T00:00:00.000Z",
        isAnonymous: false,
        quorum: 0,
        casts: [],
        ...overrides,
    };
}

const now = new Date("2026-06-15T00:00:00.000Z").getTime();

describe("isVoteClosed", () => {
    it("is closed once the deadline has passed", () => {
        expect(isVoteClosed(vote(), now)).toBe(true);
    });

    it("is closed when the status is closed even before the deadline", () => {
        expect(
            isVoteClosed(vote({ status: "closed", endsAt: "2099-01-01" }), now),
        ).toBe(true);
    });

    it("is open when live and before the deadline", () => {
        expect(isVoteClosed(vote({ endsAt: "2099-01-01" }), now)).toBe(false);
    });
});

describe("hasVotedOn", () => {
    it("detects the current user's cast", () => {
        expect(
            hasVotedOn(vote({ casts: [{ userId: "u1", choices: ["a"] }] }), "u1"),
        ).toBe(true);
    });

    it("is false without a user id", () => {
        expect(
            hasVotedOn(
                vote({ casts: [{ userId: "u1", choices: ["a"] }] }),
                undefined,
            ),
        ).toBe(false);
    });
});

describe("compareByEndsAt", () => {
    const early = vote({ endsAt: "2026-01-01" });
    const late = vote({ endsAt: "2026-12-01" });

    it("orders soonest deadline first when sorting by deadline", () => {
        expect(compareByEndsAt(early, late, "deadline")).toBeLessThan(0);
    });

    it("orders most recent deadline first when sorting by recent", () => {
        expect(compareByEndsAt(early, late, "recent")).toBeGreaterThan(0);
    });
});
