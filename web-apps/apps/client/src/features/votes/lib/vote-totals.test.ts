import { describe, expect, it } from "vitest";
import type { CommunityVote } from "./vote.types";
import { computeVoteTotals } from "./vote-totals";

function vote(overrides: Partial<CommunityVote> = {}): CommunityVote {
    return {
        _id: "v1",
        title: "Vote",
        voteType: "single_choice",
        options: [
            { id: "a", label: "A" },
            { id: "b", label: "B" },
        ],
        status: "open",
        endsAt: "2026-12-31T00:00:00.000Z",
        isAnonymous: false,
        quorum: 0,
        casts: [],
        ...overrides,
    };
}

describe("computeVoteTotals", () => {
    it("returns zero counts for every option when there are no casts", () => {
        expect(computeVoteTotals(vote())).toEqual({
            totals: { a: 0, b: 0 },
            totalParticipants: 0,
        });
    });

    it("tallies choices across casts", () => {
        const result = computeVoteTotals(
            vote({
                casts: [
                    { userId: "u1", choices: ["a"] },
                    { userId: "u2", choices: ["a", "b"] },
                ],
            }),
        );
        expect(result.totals).toEqual({ a: 2, b: 1 });
        expect(result.totalParticipants).toBe(2);
    });
});
