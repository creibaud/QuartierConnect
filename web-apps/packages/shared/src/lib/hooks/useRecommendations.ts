import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../api";
import type { Recommendation } from "../types";

export function useRecommendations() {
    return useQuery<Recommendation[]>({
        queryKey: ["recommendations"],
        queryFn: () => apiGet<Recommendation[]>("/recommendations"),
        staleTime: 5 * 60 * 1000,
    });
}
