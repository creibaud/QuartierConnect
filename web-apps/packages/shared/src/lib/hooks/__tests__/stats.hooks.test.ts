import { createElement } from "react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import * as api from "../../api";
import { useGlobalStats } from "../useStats";

vi.mock("../../api", () => ({
    apiGet: vi.fn(),
}));

function createWrapper() {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useGlobalStats", () => {
    beforeEach(() => vi.clearAllMocks());

    it("fetches global stats from /stats", async () => {
        const mockStats = {
            users: 42,
            incidents: 7,
            neighborhoods: 3,
            activeIncidents: 2,
        };
        vi.mocked(api.apiGet).mockResolvedValue(mockStats);
        const { result } = renderHook(() => useGlobalStats(), {
            wrapper: createWrapper(),
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(mockStats);
        expect(api.apiGet).toHaveBeenCalledWith("/stats");
    });

    it("handles null values in stats gracefully", async () => {
        const partialStats = {
            users: null,
            incidents: null,
            neighborhoods: null,
            activeIncidents: null,
        };
        vi.mocked(api.apiGet).mockResolvedValue(partialStats);
        const { result } = renderHook(() => useGlobalStats(), {
            wrapper: createWrapper(),
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.users).toBeNull();
        expect(result.current.data?.incidents).toBeNull();
    });

    it("enters error state on API failure", async () => {
        vi.mocked(api.apiGet).mockRejectedValue(
            new Error("Internal Server Error"),
        );
        const { result } = renderHook(() => useGlobalStats(), {
            wrapper: createWrapper(),
        });
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});
