import { createElement } from "react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import * as api from "../../api/neighborhoods.api";
import {
    useCreateNeighborhood,
    useDeleteNeighborhood,
    useNeighborhoods,
} from "../neighborhoods.hooks";

vi.mock("../../api/neighborhoods.api");

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

const mockNeighborhood = { _id: "nbh-1", name: "Belleville" };

describe("useNeighborhoods", () => {
    beforeEach(() => vi.clearAllMocks());

    it("fetches neighborhoods", async () => {
        vi.mocked(api.fetchNeighborhoods).mockResolvedValue([mockNeighborhood]);
        const { result } = renderHook(() => useNeighborhoods(), {
            wrapper: createWrapper(),
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([mockNeighborhood]);
    });

    it("returns empty list", async () => {
        vi.mocked(api.fetchNeighborhoods).mockResolvedValue([]);
        const { result } = renderHook(() => useNeighborhoods(), {
            wrapper: createWrapper(),
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([]);
    });

    it("enters error state on failure", async () => {
        vi.mocked(api.fetchNeighborhoods).mockRejectedValue(new Error("fail"));
        const { result } = renderHook(() => useNeighborhoods(), {
            wrapper: createWrapper(),
        });
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

describe("useCreateNeighborhood", () => {
    beforeEach(() => vi.clearAllMocks());

    it("calls createNeighborhood on mutate", async () => {
        vi.mocked(api.createNeighborhood).mockResolvedValue(mockNeighborhood);
        const { result } = renderHook(() => useCreateNeighborhood(), {
            wrapper: createWrapper(),
        });
        result.current.mutate({ name: "Belleville" });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(api.createNeighborhood).toHaveBeenCalledWith({
            name: "Belleville",
        });
    });
});

describe("useDeleteNeighborhood", () => {
    beforeEach(() => vi.clearAllMocks());

    it("calls deleteNeighborhood with id", async () => {
        vi.mocked(api.deleteNeighborhood).mockResolvedValue(undefined);
        const { result } = renderHook(() => useDeleteNeighborhood(), {
            wrapper: createWrapper(),
        });
        result.current.mutate("nbh-1");
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(api.deleteNeighborhood).toHaveBeenCalledWith("nbh-1");
    });
});
