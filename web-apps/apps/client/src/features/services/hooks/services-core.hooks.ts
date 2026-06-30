import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet, apiPost } from "@workspace/shared/lib/api";
import type { Service } from "@workspace/shared/lib/types";

export function useMyServices() {
    return useQuery<Service[]>({
        queryKey: ["services", "mine"],
        queryFn: () => apiGet<Service[]>("/services/mine"),
        staleTime: 30_000,
    });
}

export function useRespondedServices() {
    return useQuery<Service[]>({
        queryKey: ["services", "responded"],
        queryFn: () => apiGet<Service[]>("/services/responded"),
        staleTime: 30_000,
    });
}

export function useRespond() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (serviceId: string) =>
            apiPost<void>(`/services/${serviceId}/respond`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["services"] });
        },
    });
}

export function useUnrespond() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (serviceId: string) =>
            apiDelete<void>(`/services/${serviceId}/respond`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["services"] });
        },
    });
}

export function useContact() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (userId: string) =>
            apiPost<{ id: string }>(`/messaging/conversations/with/${userId}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["services"] });
        },
    });
}
