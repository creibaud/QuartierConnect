import { createElement } from "react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import * as api from "../../api";
import {
    getDocumentDownloadUrl,
    useDeleteDocument,
    useDocumentAuditLog,
    useMyDocuments,
    useUploadDocument,
} from "../useDocuments";

vi.mock("../../api", () => ({
    apiGet: vi.fn(),
    apiDelete: vi.fn(),
    apiUpload: vi.fn(),
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

const mockDoc = {
    _id: "doc-1",
    filename: "report.pdf",
    originalName: "report.pdf",
    mimeType: "application/pdf",
    size: 1024,
    uploadedBy: "user-1",
    createdAt: "2026-01-01T00:00:00Z",
};

describe("useMyDocuments", () => {
    beforeEach(() => vi.clearAllMocks());

    it("fetches user document list", async () => {
        vi.mocked(api.apiGet).mockResolvedValue([mockDoc]);
        const { result } = renderHook(() => useMyDocuments(), {
            wrapper: createWrapper(),
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([mockDoc]);
        expect(api.apiGet).toHaveBeenCalledWith("/documents/me");
    });

    it("enters error state on API failure", async () => {
        vi.mocked(api.apiGet).mockRejectedValue(new Error("Unauthorized"));
        const { result } = renderHook(() => useMyDocuments(), {
            wrapper: createWrapper(),
        });
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

describe("useUploadDocument", () => {
    beforeEach(() => vi.clearAllMocks());

    it("calls apiUpload with FormData on the documents endpoint", async () => {
        vi.mocked(api.apiUpload).mockResolvedValue(mockDoc);
        const { result } = renderHook(() => useUploadDocument(), {
            wrapper: createWrapper(),
        });
        const file = new File(["content"], "report.pdf", {
            type: "application/pdf",
        });
        await act(async () => {
            await result.current.mutateAsync({ file });
        });
        expect(api.apiUpload).toHaveBeenCalledWith(
            "/documents/upload",
            expect.any(FormData),
        );
    });

    it("appends neighborhoodId to query string when provided", async () => {
        vi.mocked(api.apiUpload).mockResolvedValue(mockDoc);
        const { result } = renderHook(() => useUploadDocument(), {
            wrapper: createWrapper(),
        });
        const file = new File(["content"], "report.pdf", {
            type: "application/pdf",
        });
        await act(async () => {
            await result.current.mutateAsync({ file, neighborhoodId: "nbh-1" });
        });
        expect(api.apiUpload).toHaveBeenCalledWith(
            "/documents/upload?neighborhoodId=nbh-1",
            expect.any(FormData),
        );
    });
});

describe("useDeleteDocument", () => {
    beforeEach(() => vi.clearAllMocks());

    it("calls DELETE /documents/:fileId", async () => {
        vi.mocked(api.apiDelete).mockResolvedValue({ success: true });
        const { result } = renderHook(() => useDeleteDocument(), {
            wrapper: createWrapper(),
        });
        await act(async () => {
            await result.current.mutateAsync("doc-1");
        });
        expect(api.apiDelete).toHaveBeenCalledWith("/documents/doc-1");
    });
});

describe("useDocumentAuditLog", () => {
    beforeEach(() => vi.clearAllMocks());

    it("fetches audit log for a given fileId", async () => {
        const auditEntries = [
            {
                action: "upload",
                userId: "user-1",
                createdAt: "2026-01-01T00:00:00Z",
            },
        ];
        vi.mocked(api.apiGet).mockResolvedValue(auditEntries);
        const { result } = renderHook(() => useDocumentAuditLog("doc-1"), {
            wrapper: createWrapper(),
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(api.apiGet).toHaveBeenCalledWith("/documents/doc-1/audit");
    });

    it("is disabled when fileId is empty", () => {
        const { result } = renderHook(() => useDocumentAuditLog(""), {
            wrapper: createWrapper(),
        });
        expect(result.current.fetchStatus).toBe("idle");
    });
});

describe("getDocumentDownloadUrl", () => {
    it("returns a URL containing the fileId", () => {
        const url = getDocumentDownloadUrl("doc-42");
        expect(url).toContain("doc-42");
        expect(url).toContain("/download");
    });
});
