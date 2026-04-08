import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "../api";
import type { Contract } from "../types";

export function useContracts() {
    return useQuery<Contract[]>({
        queryKey: ["contracts"],
        queryFn: () => apiGet<Contract[]>("/contracts"),
    });
}

export function useContract(id: string) {
    return useQuery<Contract>({
        queryKey: ["contracts", id],
        queryFn: () => apiGet<Contract>(`/contracts/${id}`),
        enabled: !!id,
    });
}

export function useCreateContract() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: {
            title: string;
            content: string;
            signatories?: string[];
        }) => apiPost<Contract>("/contracts", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["contracts"] });
        },
    });
}

export function useSignContract() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, totpCode }: { id: string; totpCode: string }) =>
            apiPost<Contract>(`/contracts/${id}/sign`, { totpCode }),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: ["contracts"] });
            queryClient.invalidateQueries({ queryKey: ["contracts", id] });
        },
    });
}
