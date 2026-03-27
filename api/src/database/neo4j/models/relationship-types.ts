export const NeoRelationshipType = {
    LIVES_IN: "LIVES_IN",
    KNOWS: "KNOWS",
    CREATED_EVENT: "CREATED_EVENT",
    INTERESTED_IN: "INTERESTED_IN",
    PARTICIPATED_IN: "PARTICIPATED_IN",
    CREATED_SERVICE: "CREATED_SERVICE",
    COMPLETED_SERVICE_WITH: "COMPLETED_SERVICE_WITH",
    INTERESTED_IN_CATEGORY: "INTERESTED_IN_CATEGORY",
} as const;

export type NeoRelationshipType =
    (typeof NeoRelationshipType)[keyof typeof NeoRelationshipType];
