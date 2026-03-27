export type LivesInRelation = {
    since: string;
};

export type KnowsRelation = {
    weight: number;
    since: string;
};

export type InterestedInRelation = {
    score: number;
    updatedAt: string;
};

export type ParticipatedInRelation = {
    participatedAt: string;
};

export type CompletedServiceWithRelation = {
    serviceId: string;
    points: number;
    completedAt: string;
};

export type InterestedInCategoryRelation = {
    score: number;
    updatedAt: string;
};
