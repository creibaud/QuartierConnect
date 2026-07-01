import { createElement } from "react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { apiGet, apiPost } from "../../api";
import {
    useContractAudit,
    useContracts,
    useCreateContract,
    useSignContract,
} from "../useContracts";

vi.mock("../../api", () => ({
    apiGet: vi.fn(),
    apiPost: vi.fn(),
}));

function createWrapper() {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });
    return ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children);
}

const mockContract = {
    _id: "ctr-1",
    title: "Contrat de prestation",
    content: "The provider agrees to…",
    createdBy: "user-1",
    signatories: ["user-1", "user-2"],
    status: "draft" as const,
    contentHash: null,
    signedAt: null,
    signatures: [],
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
};

describe("useContracts", () => {
    beforeEach(() => vi.clearAllMocks());

    it("fetches contract list", async () => {
        vi.mocked(apiGet).mockResolvedValue([mockContract]);
        const { result } = renderHook(() => useContracts(), {
            wrapper: createWrapper(),
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([mockContract]);
    });

    it("enters error state on failure", async () => {
        vi.mocked(apiGet).mockRejectedValue(new Error("fail"));
        const { result } = renderHook(() => useContracts(), {
            wrapper: createWrapper(),
        });
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

describe("useCreateContract", () => {
    beforeEach(() => vi.clearAllMocks());

    it("calls POST /contracts on mutate", async () => {
        vi.mocked(apiPost).mockResolvedValue(mockContract);
        const { result } = renderHook(() => useCreateContract(), {
            wrapper: createWrapper(),
        });
        result.current.mutate({ title: "Accord", content: "Contenu…" });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(apiPost).toHaveBeenCalledWith("/contracts", {
            title: "Accord",
            content: "Contenu…",
        });
    });
});

describe("useSignContract", () => {
    beforeEach(() => vi.clearAllMocks());

    it("calls POST /contracts/:id/sign with totpCode", async () => {
        vi.mocked(apiPost).mockResolvedValue({
            ...mockContract,
            status: "fully_signed",
        });
        const { result } = renderHook(() => useSignContract(), {
            wrapper: createWrapper(),
        });
        result.current.mutate({
            id: "ctr-1",
            totpCode: "123456",
            signatureImage: "data:image/png;base64,AAAA",
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(apiPost).toHaveBeenCalledWith("/contracts/ctr-1/sign", {
            totpCode: "123456",
            signatureImage: "data:image/png;base64,AAAA",
        });
    });
});

describe("useContractAudit", () => {
    beforeEach(() => vi.clearAllMocks());

    it("fetches the audit log", async () => {
        vi.mocked(apiGet).mockResolvedValue([
            { action: "generated", userId: "user-1", at: "2026-01-01T00:00:00Z" },
        ]);
        const { result } = renderHook(() => useContractAudit("ctr-1"), {
            wrapper: createWrapper(),
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(apiGet).toHaveBeenCalledWith("/contracts/ctr-1/audit");
    });
});
