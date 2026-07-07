import {
    useInfiniteQuery,
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import { apiGet, apiPatch } from "../api";
import type { User } from "../types";

export function useInfiniteUsers(limit = 20, search = "", role = "") {
    return useInfiniteQuery({
        // Filters live in the key so changing one restarts pagination.
        queryKey: ["admin", "users", search, role],
        queryFn: ({ pageParam }: { pageParam: number }) =>
            apiGet<User[]>(
                `/users?page=${pageParam}&limit=${limit}` +
                    `&search=${encodeURIComponent(search)}` +
                    `&role=${encodeURIComponent(role)}`,
            ),
        getNextPageParam: (lastPage: User[], allPages: User[][]) =>
            lastPage.length === limit ? allPages.length + 1 : undefined,
        initialPageParam: 1,
    });
}

export function useUsers(page = 1, limit = 20) {
    return useQuery<User[]>({
        queryKey: ["admin", "users", page, limit],
        queryFn: () => apiGet<User[]>(`/users?page=${page}&limit=${limit}`),
    });
}

export function useUpdateUserRole() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            id,
            role,
        }: {
            id: string;
            role: "resident" | "moderator" | "admin" | "banned";
        }) => apiPatch<User>(`/users/${id}/role`, { role }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
        },
    });
}
