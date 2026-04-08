import { apiDelete, apiGet, apiPatch, apiPost } from "../api";
import type { Event } from "../types";

export function fetchEvents(limit = 100): Promise<Event[]> {
    return apiGet<Event[]>(`/events?limit=${limit}`);
}

export function createEvent(data: {
    title: string;
    date: string;
    category: string;
    description?: string;
    location?: string;
    neighborhoodId?: string;
}): Promise<Event> {
    return apiPost<Event>("/events", data);
}

export function updateEvent(
    id: string,
    data: Partial<{
        title: string;
        date: string;
        category: string;
        description: string;
        location: string;
        neighborhoodId: string;
    }>,
): Promise<Event> {
    return apiPatch<Event>(`/events/${id}`, data);
}

export function deleteEvent(id: string): Promise<void> {
    return apiDelete<void>(`/events/${id}`);
}
