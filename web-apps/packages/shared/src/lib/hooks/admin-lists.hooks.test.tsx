import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import * as api from "../api";
import { useAdminIncidents, useAdminUsers } from "./admin-lists.hooks";

function createWrapper() {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
}

describe("useAdminIncidents", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("exposes rows and totals from a page query", async () => {
        vi.spyOn(api, "apiGetPage").mockResolvedValue({
            data: [{ id: "a" }] as never,
            total: 7,
            totalPages: 2,
        });

        const { result } = renderHook(
            () => useAdminIncidents({ page: 1, limit: 5, search: "x" }),
            { wrapper: createWrapper() },
        );

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.total).toBe(7);
        expect(result.current.totalPages).toBe(2);
        expect(result.current.rows).toHaveLength(1);
        expect(api.apiGetPage).toHaveBeenCalledWith(
            expect.stringContaining("search=x"),
        );
    });

    it("omits unset and 'all' filters from the query string", async () => {
        const spy = vi.spyOn(api, "apiGetPage").mockResolvedValue({
            data: [],
            total: 0,
            totalPages: 1,
        });

        const { result } = renderHook(
            () =>
                useAdminIncidents({
                    page: 2,
                    limit: 10,
                    status: "all",
                    category: undefined,
                    search: "",
                }),
            { wrapper: createWrapper() },
        );

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        const calledPath = spy.mock.calls[0]?.[0] ?? "";
        expect(calledPath).toContain("/incidents?");
        expect(calledPath).toContain("page=2");
        expect(calledPath).toContain("limit=10");
        expect(calledPath).not.toContain("status=");
        expect(calledPath).not.toContain("category=");
        expect(calledPath).not.toContain("search=");
    });
});

describe("useAdminUsers", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("queries the users endpoint with role and reports totals", async () => {
        const spy = vi.spyOn(api, "apiGetPage").mockResolvedValue({
            data: [{ id: "u1" }] as never,
            total: 3,
            totalPages: 1,
        });

        const { result } = renderHook(
            () => useAdminUsers({ page: 1, limit: 20, role: "admin" }),
            { wrapper: createWrapper() },
        );

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.total).toBe(3);
        expect(result.current.rows).toHaveLength(1);
        const calledPath = spy.mock.calls[0]?.[0] ?? "";
        expect(calledPath).toContain("/users?");
        expect(calledPath).toContain("role=admin");
    });
});
