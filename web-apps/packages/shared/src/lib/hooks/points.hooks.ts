import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    fetchPointBalance,
    fetchPointsHistory,
    transferPoints,
} from "../api/points.api";
import type { PointBalance, PointTransaction } from "../types";

export function usePointBalance() {
    return useQuery<PointBalance>({
        queryKey: ["points", "balance"],
        queryFn: fetchPointBalance,
        staleTime: 30_000,
    });
}

export function usePointsHistory(page = 1, limit = 20) {
    return useQuery<PointTransaction[]>({
        queryKey: ["points", "history", page, limit],
        queryFn: () => fetchPointsHistory(page, limit),
        staleTime: 30_000,
    });
}

export function useTransferPoints() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: Parameters<typeof transferPoints>[0]) =>
            transferPoints(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["points"] });
        },
    });
}
