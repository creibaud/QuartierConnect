export interface VoteOption {
    id: string;
    label: string;
}

export interface CommunityVote {
    _id: string;
    title: string;
    description?: string;
    voteType: "binary" | "single_choice" | "multiple_choice" | "weighted";
    options: VoteOption[];
    status: "open" | "closed";
    endsAt: string;
    isAnonymous: boolean;
    quorum: number;
    casts: Array<{ userId: string; choices: string[] }>;
}

export interface VoteTotals {
    totals: Record<string, number>;
    totalParticipants: number;
}
