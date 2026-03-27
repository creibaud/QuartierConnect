export type NeoUserNode = {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: "resident" | "moderator" | "admin";
    isActive: boolean;
    createdAt: string;
};

export type NeoEventNode = {
    id: string;
    title: string;
    category: string;
    startDate: string;
    createdAt: string;
};

export type NeoServiceNode = {
    id: string;
    title: string;
    category: string;
    status: string;
    createdAt: string;
};

export type NeoQuartierNode = {
    id: string;
    name: string;
};

export type NeoCategoryNode = {
    id: string;
    name: string;
};
