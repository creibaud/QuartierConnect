export type NeighborhoodStatus = {
    hasAddress: boolean;
    neighborhoodId: string | null;
};

export type AddressSubmitResult = {
    status: "assigned" | "pending" | "not_found";
    displayName?: string;
    neighborhoodId?: string | null;
};

export type GeoJsonPolygon = {
    type: "Polygon";
    coordinates: number[][][];
};

export type MyLocation = {
    address: string | null;
    lat: number | null;
    lng: number | null;
    neighborhood: { id: string; name: string; geometry: GeoJsonPolygon } | null;
};

export function gateState(s: NeighborhoodStatus): "ok" | "needs-address" | "pending" {
    if (!s.hasAddress) return "needs-address";
    if (!s.neighborhoodId) return "pending";
    return "ok";
}
