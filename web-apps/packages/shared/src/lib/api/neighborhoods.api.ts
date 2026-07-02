import { apiDelete, apiGet, apiPatch, apiPost } from "../api";
import type { GeoJsonPolygon, Neighborhood } from "../types";

export interface NeighborhoodPayload {
    name: string;
    city: string;
    description?: string;
    geometry?: GeoJsonPolygon;
}

export function fetchNeighborhoods(limit = 100): Promise<Neighborhood[]> {
    return apiGet<Neighborhood[]>(`/neighborhoods?limit=${limit}`);
}

export function createNeighborhood(
    data: NeighborhoodPayload,
): Promise<Neighborhood> {
    return apiPost<Neighborhood>("/neighborhoods", data);
}

export function updateNeighborhood(
    id: string,
    data: Partial<NeighborhoodPayload>,
): Promise<Neighborhood> {
    return apiPatch<Neighborhood>(`/neighborhoods/${id}`, data);
}

export function deleteNeighborhood(id: string): Promise<void> {
    return apiDelete<void>(`/neighborhoods/${id}`);
}
