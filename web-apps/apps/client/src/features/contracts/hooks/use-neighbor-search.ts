import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiGet } from "@workspace/shared/lib/api";

export interface Neighbor {
    id: string;
    name: string;
}

export function useNeighborSearch(search: string, enabled: boolean) {
    const term = search.trim();
    return useQuery<Neighbor[]>({
        queryKey: ["users", "neighbors", term],
        queryFn: () =>
            apiGet<Neighbor[]>(
                `/users/neighbors?search=${encodeURIComponent(term)}`,
            ),
        enabled,
        staleTime: 30_000,
        placeholderData: keepPreviousData,
    });
}

export function neighborInitials(name: string): string {
    return name
        .split(/\s+/)
        .map((part) => part.charAt(0))
        .join("")
        .slice(0, 2)
        .toUpperCase();
}
