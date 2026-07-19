import { createElement } from "react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import * as api from "../../api";
import { useAdminIncidentsForMap } from "../admin-lists.hooks";

vi.mock("../../api", () => ({
    apiGetPage: vi.fn(),
}));

function createWrapper() {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children);
}

const point = (id: number) => ({ id: `inc-${id}`, lat: 48.8, lng: 2.3 });

describe("useAdminIncidentsForMap", () => {
    beforeEach(() => vi.clearAllMocks());

    it("walks every page so the map is not capped at one page of pins", async () => {
        const pages: Record<number, ReturnType<typeof point>[]> = {
            1: Array.from({ length: 100 }, (_, i) => point(i)),
            2: Array.from({ length: 100 }, (_, i) => point(100 + i)),
            3: Array.from({ length: 50 }, (_, i) => point(200 + i)),
        };
        vi.mocked(api.apiGetPage).mockImplementation((path: string) => {
            const page = Number(new URL(path, "http://x").searchParams.get("page"));
            return Promise.resolve({
                data: pages[page] ?? [],
                total: 250,
                totalPages: 3,
            });
        });

        const { result } = renderHook(
            () => useAdminIncidentsForMap({ status: "all" }),
            { wrapper: createWrapper() },
        );

        await waitFor(() => expect(result.current.rows).toHaveLength(250));
        expect(api.apiGetPage).toHaveBeenCalledTimes(3);
        expect(result.current.rows[0].id).toBe("inc-0");
        expect(result.current.rows[249].id).toBe("inc-249");
    });

    it("fires a single request when everything fits on one page", async () => {
        vi.mocked(api.apiGetPage).mockResolvedValue({
            data: [point(1), point(2)],
            total: 2,
            totalPages: 1,
        });

        const { result } = renderHook(
            () => useAdminIncidentsForMap({ status: "open" }),
            { wrapper: createWrapper() },
        );

        await waitFor(() => expect(result.current.rows).toHaveLength(2));
        expect(api.apiGetPage).toHaveBeenCalledTimes(1);
    });
});
