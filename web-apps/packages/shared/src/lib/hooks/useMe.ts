import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet, apiPatch, apiUpload } from "../api";
import { clearTokens } from "../auth";
import type { MyProfile, UserExport } from "../types";

export function useMyProfile() {
    return useQuery<MyProfile>({
        queryKey: ["me", "profile"],
        queryFn: () => apiGet<MyProfile>("/users/me/profile"),
    });
}

export function useUpdateProfile() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (body: { firstName?: string; lastName?: string }) =>
            apiPatch<MyProfile>("/users/me/profile", body),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["me", "profile"] });
        },
    });
}

export function useUploadAvatar() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (file: Blob) => {
            const formData = new FormData();
            formData.append("file", file, "avatar.jpg");
            return apiUpload<MyProfile>("/users/me/avatar", formData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["me", "profile"] });
        },
    });
}

export function useDeleteAvatar() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => apiDelete<MyProfile>("/users/me/avatar"),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["me", "profile"] });
        },
    });
}

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
