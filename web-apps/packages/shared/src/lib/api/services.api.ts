import { apiDelete, apiGet, apiPatch, apiPost } from "../api";
import type { Service } from "../types";

export function fetchServices(params?: {
    neighborhoodId?: string;
    page?: number;
    limit?: number;
}): Promise<Service[]> {
    const { neighborhoodId, page = 1, limit = 20 } = params ?? {};
    const qs = new URLSearchParams({
        page: String(page),
        limit: String(limit),
    });
    if (neighborhoodId) qs.set("neighborhoodId", neighborhoodId);
    return apiGet<Service[]>(`/services?${qs}`);
}

export function createService(data: {
    title: string;
    category: string;
    type: "free" | "paid" | "exchange";
    description?: string;
    address?: string;
    neighborhoodId?: string;
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
    }>,
): Promise<Service> {
    return apiPatch<Service>(`/services/${id}`, data);
}

export function deleteService(id: string): Promise<void> {
    return apiDelete<void>(`/services/${id}`);
}
