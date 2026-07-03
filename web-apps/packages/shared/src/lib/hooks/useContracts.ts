import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiUpload } from "../api";
import type {
    Contract,
    ContractAuditEntry,
    SignatureZone,
} from "../types";

export function useContracts() {
    return useQuery<Contract[]>({
        queryKey: ["contracts"],
        queryFn: () => apiGet<Contract[]>("/contracts"),
    });
}

export function useContract(id: string) {
    return useQuery<Contract>({
        queryKey: ["contracts", id],
        queryFn: () => apiGet<Contract>(`/contracts/${id}`),
        enabled: !!id,
    });
}

export function useContractAudit(id: string) {
    return useQuery<ContractAuditEntry[]>({
        queryKey: ["contracts", id, "audit"],
        queryFn: () => apiGet<ContractAuditEntry[]>(`/contracts/${id}/audit`),
        enabled: !!id,
    });
}

export function useCreateContract() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: {
            title: string;
            content: string;
            signatories?: string[];
        }) => apiPost<Contract>("/contracts", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["contracts"] });
        },
    });
}

export interface ImportContractInput {
    file: File;
    title: string;
    signatories: string[];
    zones: SignatureZone[];
}

export function buildImportContractFormData(
    input: ImportContractInput,
): FormData {
    const formData = new FormData();
    formData.append("file", input.file);
    formData.append("title", input.title);
    formData.append("signatories", JSON.stringify(input.signatories));
    formData.append("zones", JSON.stringify(input.zones));
    return formData;
}

export function useImportContract() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (input: ImportContractInput) =>
            apiUpload<Contract>(
                "/contracts/import",
                buildImportContractFormData(input),
            ),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["contracts"] });
        },
    });
}

export function useSignContract() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            id,
            totpCode,
            signatureImage,
        }: {
            id: string;
            totpCode: string;
            signatureImage?: string;
        }) =>
            apiPost<Contract>(`/contracts/${id}/sign`, {
                totpCode,
                signatureImage,
            }),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: ["contracts"] });
            queryClient.invalidateQueries({ queryKey: ["contracts", id] });
        },
    });
}
