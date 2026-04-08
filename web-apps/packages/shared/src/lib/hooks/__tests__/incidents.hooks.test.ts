import { createElement } from "react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import * as api from "../../api/incidents.api";
import {
    useCreateIncident,
    useIncident,
    useInfiniteIncidents,
    useUpdateIncidentStatus,
} from "../incidents.hooks";

vi.mock("../../api/incidents.api");

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

const mockIncident = {
    id: "inc-1",
    title: "Test incident",
    description: null,
    status: "open" as const,
    neighborhoodId: null,
    createdBy: "user-1",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
};

describe("useInfiniteIncidents", () => {
    beforeEach(() => vi.clearAllMocks());

    it("returns fetched incidents", async () => {
        vi.mocked(api.fetchIncidents).mockResolvedValue([mockIncident]);
        const { result } = renderHook(() => useInfiniteIncidents(), {
            wrapper: createWrapper(),
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.pages.flat()).toEqual([mockIncident]);
    });

    it("returns empty list on empty page", async () => {
        vi.mocked(api.fetchIncidents).mockResolvedValue([]);
        const { result } = renderHook(() => useInfiniteIncidents(), {
            wrapper: createWrapper(),
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.pages.flat()).toEqual([]);
    });

    it("enters error state on API failure", async () => {
        vi.mocked(api.fetchIncidents).mockRejectedValue(
            new Error("Network error"),
        );
        const { result } = renderHook(() => useInfiniteIncidents(), {
            wrapper: createWrapper(),
        });
        await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("hasNextPage is false when page is shorter than limit", async () => {
        vi.mocked(api.fetchIncidents).mockResolvedValue([mockIncident]);
        const { result } = renderHook(() => useInfiniteIncidents(20), {
            wrapper: createWrapper(),
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.hasNextPage).toBe(false);
    });
});

describe("useIncident", () => {
    beforeEach(() => vi.clearAllMocks());

    it("fetches incident by id", async () => {
        vi.mocked(api.fetchIncident).mockResolvedValue(mockIncident);
        const { result } = renderHook(() => useIncident("inc-1"), {
            wrapper: createWrapper(),
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(mockIncident);
    });

    it("is disabled when id is empty", () => {
        const { result } = renderHook(() => useIncident(""), {
            wrapper: createWrapper(),
        });
        expect(result.current.fetchStatus).toBe("idle");
    });
});

describe("useCreateIncident", () => {
    beforeEach(() => vi.clearAllMocks());

    it("calls createIncident and invalidates incidents query", async () => {
        vi.mocked(api.createIncident).mockResolvedValue(mockIncident);
        const { result } = renderHook(() => useCreateIncident(), {
            wrapper: createWrapper(),
        });
        result.current.mutate({ title: "New", description: "Desc" });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(api.createIncident).toHaveBeenCalledWith({
            title: "New",
            description: "Desc",
        });
    });
});

describe("useUpdateIncidentStatus", () => {
    beforeEach(() => vi.clearAllMocks());

    it("calls updateIncidentStatus with id and status", async () => {
        vi.mocked(api.updateIncidentStatus).mockResolvedValue({
            ...mockIncident,
            status: "resolved",
        });
        const { result } = renderHook(() => useUpdateIncidentStatus(), {
            wrapper: createWrapper(),
        });
        result.current.mutate({ id: "inc-1", status: "resolved" });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(api.updateIncidentStatus).toHaveBeenCalledWith(
            "inc-1",
            "resolved",
        );
    });
});
