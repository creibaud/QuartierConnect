import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet, apiUpload } from "../api";
import type { DocumentMeta } from "../types";

export function useMyDocuments() {
    return useQuery<DocumentMeta[]>({
        queryKey: ["documents", "me"],
        queryFn: () => apiGet<DocumentMeta[]>("/documents/me"),
    });
}

export function useUploadDocument() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            file,
            neighborhoodId,
        }: {
            file: File;
            neighborhoodId?: string;
        }) => {
            const fd = new FormData();
            fd.append("file", file);
            const qs = neighborhoodId
                ? `?neighborhoodId=${neighborhoodId}`
                : "";
            return apiUpload<DocumentMeta>(`/documents/upload${qs}`, fd);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["documents", "me"] });
        },
    });
}

export function useDeleteDocument() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (fileId: string) =>
            apiDelete<{ success: boolean }>(`/documents/${fileId}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["documents", "me"] });
        },
    });
}

export function useDocumentAuditLog(fileId: string) {
    return useQuery({
        queryKey: ["documents", "audit", fileId],
        queryFn: () => apiGet(`/documents/${fileId}/audit`),
        enabled: !!fileId,
    });
}

export function getDocumentDownloadUrl(fileId: string): string {
    const base = import.meta.env.VITE_API_URL ?? "http://localhost:5000";
    return `${base}/documents/${fileId}/download`;
}
