import type { ObjectId } from "mongodb";

export const VOTES_COLLECTION = "votes";
export const VOTE_RESPONSES_COLLECTION = "vote_responses";

export type VoteType = "binary" | "single_choice" | "multi_choice" | "weighted";

export type VoteOption = {
    id: string;
    label: string;
    votesCount: number;
};

export type VoteDocument = {
    _id?: ObjectId;
    quartierId: string;
    creatorId: string;
    title: string;
    description?: string;
    type: VoteType;
    options: VoteOption[];
    durationMinutes: number;
    isAnonymous: boolean;
    quorumRequired?: number;
    showResults: boolean;
    restrictedToGroup?: string;
    startedAt: Date;
    endsAt: Date;
    createdAt: Date;
};

export type VoteResponseDocument = {
    _id?: ObjectId;
    voteId: string;
    userId: string;
    selectedOptions: string[];
    weightedValues?: Record<string, number>;
    respondedAt: Date;
};
