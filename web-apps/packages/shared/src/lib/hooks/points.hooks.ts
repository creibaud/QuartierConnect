import { useQuery } from "@tanstack/react-query";
import { fetchPointBalance } from "../api/points.api";
import type { PointBalance } from "../types";

export function usePointBalance() {
    return useQuery<PointBalance>({
        queryKey: ["points", "balance"],
        queryFn: fetchPointBalance,
        staleTime: 30_000,
    });
}
