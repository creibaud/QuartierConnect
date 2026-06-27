import { createElement } from "react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import * as api from "../../api/events.api";
import { useCreateEvent, useEvents } from "../events.hooks";

vi.mock("../../api/events.api");

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

const mockEvent = {
    _id: "evt-1",
    title: "Neighborhood party",
    description: "Big annual party",
    category: "community",
    date: "2026-06-21T18:00:00Z",
    location: "Market square",
    neighborhoodId: "nbh-1",
};

describe("useEvents", () => {
    beforeEach(() => vi.clearAllMocks());

    it("fetches events", async () => {
        vi.mocked(api.fetchEvents).mockResolvedValue([mockEvent]);
        const { result } = renderHook(() => useEvents(), {
            wrapper: createWrapper(),
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([mockEvent]);
    });

    it("returns empty list", async () => {
        vi.mocked(api.fetchEvents).mockResolvedValue([]);
        const { result } = renderHook(() => useEvents(), {
            wrapper: createWrapper(),
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([]);
    });

    it("enters error state on failure", async () => {
        vi.mocked(api.fetchEvents).mockRejectedValue(new Error("fail"));
        const { result } = renderHook(() => useEvents(), {
            wrapper: createWrapper(),
        });
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

describe("useCreateEvent", () => {
    beforeEach(() => vi.clearAllMocks());

    it("calls createEvent and invalidates", async () => {
        vi.mocked(api.createEvent).mockResolvedValue(mockEvent);
        const { result } = renderHook(() => useCreateEvent(), {
            wrapper: createWrapper(),
        });
        result.current.mutate({
            title: "Party",
            date: "2026-06-21T18:00:00Z",
            category: "community",
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(api.createEvent).toHaveBeenCalledWith({
            title: "Party",
            date: "2026-06-21T18:00:00Z",
            category: "community",
        });
    });
});
