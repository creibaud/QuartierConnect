import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../api";
import type { User } from "../types";

export type UserSearchResult = Pick<User, "id" | "email" | "role">;

export function useUserSearch(query: string) {
    const term = query.trim();
    return useQuery<UserSearchResult[]>({
        queryKey: ["users", "search", term],
        queryFn: () =>
            apiGet<UserSearchResult[]>(
                `/users/search?q=${encodeURIComponent(term)}`,
            ),
        enabled: term.length >= 2,
        staleTime: 30_000,
    });
}
