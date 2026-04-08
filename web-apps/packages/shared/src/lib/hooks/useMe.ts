import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet } from "../api";
import { clearTokens } from "../auth";
import type { UserExport } from "../types";

export function useMyDataExport() {
    return useQuery<UserExport>({
        queryKey: ["me", "export"],
        queryFn: () => apiGet<UserExport>("/users/me/export"),
    });
}

export function useDeleteMyAccount() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => apiDelete<{ success: boolean }>("/users/me"),
        onSuccess: () => {
            clearTokens();
            queryClient.clear();
            window.location.href = "/login";
        },
    });
}
