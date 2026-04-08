import { createElement } from "react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import * as api from "../../api";
import { useRecommendations } from "../useRecommendations";

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

const mockRecommendations = [
    { serviceId: "svc-1", score: 0.9, reason: "Neighbors used this" },
    { serviceId: "svc-2", score: 0.7, reason: "Popular in your area" },
];

describe("useRecommendations", () => {
    beforeEach(() => vi.clearAllMocks());

    it("fetches recommendation list from /recommendations", async () => {
        vi.mocked(api.apiGet).mockResolvedValue(mockRecommendations);
        const { result } = renderHook(() => useRecommendations(), {
            wrapper: createWrapper(),
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(mockRecommendations);
        expect(api.apiGet).toHaveBeenCalledWith("/recommendations");
    });

    it("returns empty array when API returns no recommendations", async () => {
        vi.mocked(api.apiGet).mockResolvedValue([]);
        const { result } = renderHook(() => useRecommendations(), {
            wrapper: createWrapper(),
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([]);
    });

    it("enters error state on API failure", async () => {
        vi.mocked(api.apiGet).mockRejectedValue(
            new Error("Service unavailable"),
        );
        const { result } = renderHook(() => useRecommendations(), {
            wrapper: createWrapper(),
        });
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});
