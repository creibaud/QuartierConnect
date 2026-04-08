import { createElement } from "react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { apiGet, apiPost } from "../../api";
import { useCastVote, useVoteScore } from "../useVotes";

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

describe("useVoteScore", () => {
    beforeEach(() => vi.clearAllMocks());

    it("fetches vote score", async () => {
        vi.mocked(apiGet).mockResolvedValue({
            score: 3,
            breakdown: { up: 4, down: 1 },
        });
        const { result } = renderHook(() => useVoteScore("inc-1", "incident"), {
            wrapper: createWrapper(),
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.score).toBe(3);
    });

    it("is disabled when targetId is empty", () => {
        const { result } = renderHook(() => useVoteScore("", "incident"), {
            wrapper: createWrapper(),
        });
        expect(result.current.fetchStatus).toBe("idle");
    });
});

describe("useCastVote", () => {
    beforeEach(() => vi.clearAllMocks());

    it("calls POST /votes on mutate", async () => {
        vi.mocked(apiPost).mockResolvedValue({
            action: "added",
            voteType: "up",
        });
        const { result } = renderHook(() => useCastVote(), {
            wrapper: createWrapper(),
        });
        result.current.mutate({
            targetType: "incident",
            targetId: "inc-1",
            voteType: "up",
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(apiPost).toHaveBeenCalledWith("/votes", {
            targetType: "incident",
            targetId: "inc-1",
            voteType: "up",
        });
    });

    it("invalidates vote query on error", async () => {
        const queryClient = new QueryClient({
            defaultOptions: {
                queries: { retry: false },
                mutations: { retry: false },
            },
        });
        const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
        vi.mocked(apiPost).mockRejectedValue(new Error("Network error"));

        const wrapper = ({ children }: { children: React.ReactNode }) =>
            createElement(
                QueryClientProvider,
                { client: queryClient },
                children,
            );

        const { result } = renderHook(() => useCastVote(), { wrapper });
        result.current.mutate({
            targetType: "incident",
            targetId: "inc-1",
            voteType: "up",
        });
        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: ["votes", "incident", "inc-1"],
        });
    });
});
