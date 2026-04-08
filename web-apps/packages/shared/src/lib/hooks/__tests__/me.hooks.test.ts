import { createElement } from "react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import * as api from "../../api";
import * as auth from "../../auth";
import { useDeleteMyAccount, useMyDataExport } from "../useMe";

vi.mock("../../api", () => ({
    apiGet: vi.fn(),
    apiDelete: vi.fn(),
}));
vi.mock("../../auth", () => ({
    clearTokens: vi.fn(),
}));

// jsdom provides window.location but href is read-only by default.
// Override it so useDeleteMyAccount's redirect doesn't throw.
Object.defineProperty(window, "location", {
    writable: true,
    value: { href: "" },
});

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

describe("useMyDataExport", () => {
    beforeEach(() => vi.clearAllMocks());

    it("fetches RGPD export data", async () => {
        const exportData = {
            email: "alice@test.fr",
            incidents: [],
            points: [],
        };
        vi.mocked(api.apiGet).mockResolvedValue(exportData);
        const { result } = renderHook(() => useMyDataExport(), {
            wrapper: createWrapper(),
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(exportData);
        expect(api.apiGet).toHaveBeenCalledWith("/users/me/export");
    });

    it("enters error state on API failure", async () => {
        vi.mocked(api.apiGet).mockRejectedValue(new Error("Unauthorized"));
        const { result } = renderHook(() => useMyDataExport(), {
            wrapper: createWrapper(),
        });
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

describe("useDeleteMyAccount", () => {
    beforeEach(() => vi.clearAllMocks());

    it("calls DELETE /users/me and clears tokens on success", async () => {
        vi.mocked(api.apiDelete).mockResolvedValue({ success: true });
        const { result } = renderHook(() => useDeleteMyAccount(), {
            wrapper: createWrapper(),
        });
        await act(async () => {
            await result.current.mutateAsync();
        });
        expect(api.apiDelete).toHaveBeenCalledWith("/users/me");
        expect(auth.clearTokens).toHaveBeenCalled();
    });

    it("redirects to /login after deletion", async () => {
        vi.mocked(api.apiDelete).mockResolvedValue({ success: true });
        window.location.href = "";
        const { result } = renderHook(() => useDeleteMyAccount(), {
            wrapper: createWrapper(),
        });
        await act(async () => {
            await result.current.mutateAsync();
        });
        expect(window.location.href).toBe("/login");
    });
});
