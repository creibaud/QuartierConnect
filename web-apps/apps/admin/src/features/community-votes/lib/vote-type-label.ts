import type { TFunction } from "i18next";
import type { VoteType } from "./community-vote.types";

export const VOTE_TYPES: VoteType[] = [
    "binary",
    "single_choice",
    "multiple_choice",
    "weighted",
];

export function voteTypeLabel(t: TFunction, voteType: VoteType): string {
    return t(`adminPages.communityVotes.voteTypes.${voteType}`);
}
