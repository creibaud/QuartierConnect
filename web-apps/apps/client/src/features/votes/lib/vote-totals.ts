import type { CommunityVote, VoteTotals } from "./vote.types";

export function computeVoteTotals(vote: CommunityVote): VoteTotals {
    const totals: Record<string, number> = Object.fromEntries(
        vote.options.map((option) => [option.id, 0]),
    );
    for (const cast of vote.casts) {
        for (const choiceId of cast.choices) {
            totals[choiceId] = (totals[choiceId] ?? 0) + 1;
        }
    }
    return { totals, totalParticipants: vote.casts.length };
}
