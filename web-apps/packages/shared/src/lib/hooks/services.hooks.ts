import {
    useInfiniteQuery,
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import {
    createService,
    deleteService,
    fetchServices,
    updateService,
} from "../api/services.api";
import type { Service } from "../types";

export function useInfiniteServices(neighborhoodId?: string, limit = 20) {
    return useInfiniteQuery({
        queryKey: ["services", neighborhoodId ?? "all"],
        queryFn: ({ pageParam }: { pageParam: number }) =>
            fetchServices({
                neighborhoodId:
                    neighborhoodId !== "all" ? neighborhoodId : undefined,
                page: pageParam,
                limit,
            }),
        getNextPageParam: (lastPage: Service[], allPages: Service[][]) =>
            lastPage.length === limit ? allPages.length + 1 : undefined,
        initialPageParam: 1,
        staleTime: 30_000,
    });
}

export function useServices(params?: {
    neighborhoodId?: string;
    page?: number;
    limit?: number;
}) {
    const { neighborhoodId, page = 1, limit = 100 } = params ?? {};
    return useQuery({
        queryKey: ["services", neighborhoodId ?? "all", page],
        queryFn: () => fetchServices({ neighborhoodId, page, limit }),
        staleTime: 30_000,
    });
}

export function useCreateService() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: Parameters<typeof createService>[0]) =>
            createService(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["services"] });
        },
    });
}

export function useUpdateService() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            id,
            data,
        }: {
            id: string;
            data: Parameters<typeof updateService>[1];
        }) => updateService(id, data),
        onSuccess: (_: Service) => {
            queryClient.invalidateQueries({ queryKey: ["services"] });
        },
    });
}

export function useDeleteService() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => deleteService(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["services"] });
        },
    });
}
