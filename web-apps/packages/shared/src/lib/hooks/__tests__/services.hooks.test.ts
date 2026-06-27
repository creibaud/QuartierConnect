import { createElement } from "react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import * as api from "../../api/services.api";
import {
    useCreateService,
    useDeleteService,
    useServices,
} from "../services.hooks";

vi.mock("../../api/services.api");

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

const mockService = {
    _id: "svc-1",
    title: "Library",
    category: "culture",
    type: "free",
    description: "Book lending",
    address: "1 rue de la Paix",
    neighborhoodId: "nbh-1",
};

describe("useServices", () => {
    beforeEach(() => vi.clearAllMocks());

    it("fetches services without filter", async () => {
        vi.mocked(api.fetchServices).mockResolvedValue([mockService]);
        const { result } = renderHook(() => useServices(), {
            wrapper: createWrapper(),
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([mockService]);
        expect(api.fetchServices).toHaveBeenCalledWith({ page: 1, limit: 100 });
    });

    it("passes neighborhoodId filter", async () => {
        vi.mocked(api.fetchServices).mockResolvedValue([mockService]);
        const { result } = renderHook(
            () => useServices({ neighborhoodId: "nbh-1" }),
            { wrapper: createWrapper() },
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(api.fetchServices).toHaveBeenCalledWith({
            neighborhoodId: "nbh-1",
            page: 1,
            limit: 100,
        });
    });

    it("enters error state on API failure", async () => {
        vi.mocked(api.fetchServices).mockRejectedValue(new Error("fail"));
        const { result } = renderHook(() => useServices(), {
            wrapper: createWrapper(),
        });
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

describe("useCreateService", () => {
    beforeEach(() => vi.clearAllMocks());

    it("calls createService on mutate", async () => {
        vi.mocked(api.createService).mockResolvedValue(mockService);
        const { result } = renderHook(() => useCreateService(), {
            wrapper: createWrapper(),
        });
        result.current.mutate({
            title: "Library",
            category: "culture",
            type: "free",
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(api.createService).toHaveBeenCalledWith({
            title: "Library",
            category: "culture",
            type: "free",
        });
    });
});

describe("useDeleteService", () => {
    beforeEach(() => vi.clearAllMocks());

    it("calls deleteService with id", async () => {
        vi.mocked(api.deleteService).mockResolvedValue(undefined);
        const { result } = renderHook(() => useDeleteService(), {
            wrapper: createWrapper(),
        });
        result.current.mutate("svc-1");
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(api.deleteService).toHaveBeenCalledWith("svc-1");
    });
});
