export const NeoNodeLabel = {
    User: "User",
    Event: "Event",
    Service: "Service",
    Quartier: "Quartier",
    Category: "Category",
} as const;

export type NeoNodeLabel = (typeof NeoNodeLabel)[keyof typeof NeoNodeLabel];
