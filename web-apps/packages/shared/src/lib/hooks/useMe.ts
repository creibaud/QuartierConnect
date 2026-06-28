import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet, apiPatch } from "../api";
import { clearTokens } from "../auth";
import type { UserExport } from "../types";

export function useMyDataExport() {
    return useQuery<UserExport>({
        queryKey: ["me", "export"],
        queryFn: () => apiGet<UserExport>("/users/me/export"),
    });
}

export function useChangePassword() {
    return useMutation({
        mutationFn: (body: { currentPassword: string; newPassword: string }) =>
            apiPatch<{ success: boolean }>("/users/me/password", body),
    });
}

export function useDeleteMyAccount() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (totpCode: string) =>
            apiDelete<{ success: boolean }>("/users/me", { totpCode }),
        onSuccess: () => {
            clearTokens();
            queryClient.clear();
            window.location.href = "/login";
        },
    });
}
