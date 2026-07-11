import type { CommunityVote } from "./vote.types";

export type VoteSort = "deadline" | "recent";

export function isVoteClosed(vote: CommunityVote, now: number): boolean {
    return vote.status === "closed" || now > new Date(vote.endsAt).getTime();
}

export function hasVotedOn(
    vote: CommunityVote,
    userId: string | undefined,
): boolean {
    return !!userId && vote.casts.some((c) => c.userId === userId);
}

export function compareByEndsAt(
    a: CommunityVote,
    b: CommunityVote,
    sort: VoteSort,
): number {
    return sort === "deadline"
        ? new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime()
        : new Date(b.endsAt).getTime() - new Date(a.endsAt).getTime();
}
