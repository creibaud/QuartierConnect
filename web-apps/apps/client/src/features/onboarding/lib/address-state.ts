export type NeighborhoodStatus = {
    hasAddress: boolean;
    neighborhoodId: string | null;
};

export type AddressSubmitResult = {
    status: "assigned" | "pending" | "not_found";
    displayName?: string;
    neighborhoodId?: string | null;
};

export function gateState(s: NeighborhoodStatus): "ok" | "needs-address" | "pending" {
    if (!s.hasAddress) return "needs-address";
    if (!s.neighborhoodId) return "pending";
    return "ok";
}
