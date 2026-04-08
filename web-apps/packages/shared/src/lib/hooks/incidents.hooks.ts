import {
    useInfiniteQuery,
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import {
    createIncident,
    fetchIncident,
    fetchIncidents,
    updateIncidentStatus,
} from "../api/incidents.api";
import type { Incident } from "../types";

export function useInfiniteIncidents(limit = 20, status?: string) {
    return useInfiniteQuery({
        queryKey: ["incidents", status ?? "all"],
        queryFn: ({ pageParam }: { pageParam: number }) =>
            fetchIncidents(pageParam, limit, status),
        getNextPageParam: (lastPage: Incident[], allPages: Incident[][]) =>
            lastPage.length === limit ? allPages.length + 1 : undefined,
        initialPageParam: 1,
    });
}

export function useIncident(id: string) {
    return useQuery({
        queryKey: ["incidents", id],
        queryFn: () => fetchIncident(id),
        enabled: !!id,
    });
}

export function useCreateIncident() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: Parameters<typeof createIncident>[0]) =>
            createIncident(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["incidents"] });
        },
    });
}

export function useUpdateIncidentStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            id,
            status,
        }: {
            id: string;
            status: "open" | "in_progress" | "resolved";
        }) => updateIncidentStatus(id, status),
        onSuccess: (updated: Incident) => {
            queryClient.invalidateQueries({ queryKey: ["incidents"] });
            queryClient.setQueryData(["incidents", updated.id], updated);
        },
    });
}
