import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../api";
import type { User } from "../types";

// Names and avatars are nullable in the schema: an account exists from sign-up,
// before the user has filled in a profile, so the picker must render without them.
export type UserSearchResult = Pick<User, "id" | "email" | "role"> & {
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
};

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
