import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    createEvent,
    deleteEvent,
    fetchEvents,
    updateEvent,
} from "../api/events.api";
import type { Event } from "../types";

export function useEvents(limit = 100) {
    return useQuery({
        queryKey: ["events"],
        queryFn: () => fetchEvents(limit),
        staleTime: 30_000,
    });
}

export function useCreateEvent() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: Parameters<typeof createEvent>[0]) =>
            createEvent(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["events"] });
        },
    });
}

export function useUpdateEvent() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            id,
            data,
        }: {
            id: string;
            data: Parameters<typeof updateEvent>[1];
        }) => updateEvent(id, data),
        onSuccess: (_: Event) => {
            queryClient.invalidateQueries({ queryKey: ["events"] });
        },
    });
}

export function useDeleteEvent() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => deleteEvent(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["events"] });
        },
    });
}
