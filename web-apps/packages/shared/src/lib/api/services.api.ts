import { apiDelete, apiGet, apiPatch, apiPost } from "../api";
import type { GeoJsonPoint, Service } from "../types";

export function fetchServices(params?: {
    neighborhoodId?: string;
    page?: number;
    limit?: number;
    direction?: "offer" | "request";
}): Promise<Service[]> {
    const { neighborhoodId, page = 1, limit = 20, direction } = params ?? {};
    const qs = new URLSearchParams({
        page: String(page),
        limit: String(limit),
    });
    if (neighborhoodId) qs.set("neighborhoodId", neighborhoodId);
    if (direction) qs.set("direction", direction);
    return apiGet<Service[]>(`/services?${qs}`);
}

export function createService(data: {
    title: string;
    category: string;
    type: "free" | "paid" | "exchange";
    description?: string;
    address?: string;
    neighborhoodId?: string;
    pointsMultiplier?: number;
    location?: GeoJsonPoint;
}): Promise<Service> {
    return apiPost<Service>("/services", data);
}

export function updateService(
    id: string,
    data: Partial<{
        title: string;
        category: string;
        type: string;
        description: string;
        address: string;
        neighborhoodId: string;
        pointsMultiplier: number;
        location: GeoJsonPoint;
    }>,
): Promise<Service> {
    return apiPatch<Service>(`/services/${id}`, data);
}

export function deleteService(id: string): Promise<void> {
    return apiDelete<void>(`/services/${id}`);
}
