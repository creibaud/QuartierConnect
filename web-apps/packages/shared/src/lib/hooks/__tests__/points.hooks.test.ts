import { createElement } from "react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import * as api from "../../api/points.api";
import { usePointBalance } from "../points.hooks";

vi.mock("../../api/points.api");

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

describe("usePointBalance", () => {
    beforeEach(() => vi.clearAllMocks());

    it("returns balance", async () => {
        vi.mocked(api.fetchPointBalance).mockResolvedValue({ balance: 42 });
        const { result } = renderHook(() => usePointBalance(), {
            wrapper: createWrapper(),
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.balance).toBe(42);
    });

    it("balance of zero is valid", async () => {
        vi.mocked(api.fetchPointBalance).mockResolvedValue({ balance: 0 });
        const { result } = renderHook(() => usePointBalance(), {
            wrapper: createWrapper(),
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.balance).toBe(0);
    });

    it("enters error state on failure", async () => {
        vi.mocked(api.fetchPointBalance).mockRejectedValue(new Error("fail"));
        const { result } = renderHook(() => usePointBalance(), {
            wrapper: createWrapper(),
        });
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});
