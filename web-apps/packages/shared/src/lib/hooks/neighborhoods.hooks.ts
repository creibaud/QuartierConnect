import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    createNeighborhood,
    deleteNeighborhood,
    fetchNeighborhoods,
    updateNeighborhood,
} from "../api/neighborhoods.api";
import type { Neighborhood } from "../types";

export function useNeighborhoods(limit = 100) {
    return useQuery({
        queryKey: ["neighborhoods"],
        queryFn: () => fetchNeighborhoods(limit),
        staleTime: 30_000,
    });
}

export function useCreateNeighborhood() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: Parameters<typeof createNeighborhood>[0]) =>
            createNeighborhood(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["neighborhoods"] });
        },
    });
}

export function useUpdateNeighborhood() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            id,
            data,
        }: {
            id: string;
            data: Parameters<typeof updateNeighborhood>[1];
        }) => updateNeighborhood(id, data),
        onSuccess: (_: Neighborhood) => {
            queryClient.invalidateQueries({ queryKey: ["neighborhoods"] });
        },
    });
}

export function useDeleteNeighborhood() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => deleteNeighborhood(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["neighborhoods"] });
        },
    });
}
