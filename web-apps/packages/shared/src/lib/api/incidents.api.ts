import { apiGet, apiPatch, apiPost } from "../api";
import type { Incident } from "../types";

export function fetchIncidents(
    page = 1,
    limit = 20,
    status?: string,
): Promise<Incident[]> {
    const qs = new URLSearchParams({
        page: String(page),
        limit: String(limit),
    });
    if (status && status !== "all") qs.set("status", status);
    return apiGet<Incident[]>(`/incidents?${qs}`);
}

export function fetchIncident(id: string): Promise<Incident> {
    return apiGet<Incident>(`/incidents/${id}`);
}

export function createIncident(data: {
    title: string;
    description?: string;
    neighborhoodId?: string;
}): Promise<Incident> {
    return apiPost<Incident>("/incidents", data);
}

export function updateIncidentStatus(
    id: string,
    status: "open" | "in_progress" | "resolved",
): Promise<Incident> {
    return apiPatch<Incident>(`/incidents/${id}`, { status });
}
