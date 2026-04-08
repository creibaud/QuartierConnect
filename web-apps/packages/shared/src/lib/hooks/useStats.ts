import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../api";

export interface GlobalStats {
    users: number | null;
    incidents: number | null;
    neighborhoods: number | null;
    activeIncidents: number | null;
}

export function useGlobalStats() {
    return useQuery<GlobalStats>({
        queryKey: ["admin", "stats"],
        queryFn: () => apiGet<GlobalStats>("/stats"),
        staleTime: 30 * 1000,
    });
}
