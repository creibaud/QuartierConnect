export interface CommunityVoteCast {
    userId: string;
}

export interface CommunityVote {
    _id: string;
    title: string;
    status: "open" | "closed";
    endsAt?: string;
    casts?: CommunityVoteCast[];
}
