import { apiDelete, apiGet, apiPatch, apiPost } from "../api";
import type { Neighborhood } from "../types";

export function fetchNeighborhoods(limit = 100): Promise<Neighborhood[]> {
    return apiGet<Neighborhood[]>(`/neighborhoods?limit=${limit}`);
}

export function createNeighborhood(data: {
    name: string;
    description?: string;
}): Promise<Neighborhood> {
    return apiPost<Neighborhood>("/neighborhoods", data);
}

export function updateNeighborhood(
    id: string,
    data: Partial<{ name: string; description: string }>,
): Promise<Neighborhood> {
    return apiPatch<Neighborhood>(`/neighborhoods/${id}`, data);
}

export function deleteNeighborhood(id: string): Promise<void> {
    return apiDelete<void>(`/neighborhoods/${id}`);
}
