export type VoteType =
    | "binary"
    | "single_choice"
    | "multiple_choice"
    | "weighted";

export interface VoteOption {
    id: string;
    label: string;
}

export interface CommunityVote {
    _id: string;
    title: string;
    voteType: VoteType;
    status: "open" | "closed";
    endsAt: string;
    casts: unknown[];
    /** True ballot count; `casts` is stripped to the requester's own on anonymous votes. */
    participantCount?: number;
}

export interface VoteResultOption {
    optionId: string;
    label: string;
    count: number;
    percentage: number;
}

export interface VoteResults {
    totalVotes: number;
    results: VoteResultOption[];
    status: "open" | "closed";
    quorumReached: boolean;
}
