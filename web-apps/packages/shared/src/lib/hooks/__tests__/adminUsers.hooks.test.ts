import { createElement } from "react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import * as api from "../../api";
import { useUpdateUserRole, useUsers } from "../useAdminUsers";

vi.mock("../../api", () => ({
    apiGet: vi.fn(),
    apiPatch: vi.fn(),
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

const mockUser = {
    id: "user-1",
    email: "alice@test.fr",
    role: "resident" as const,
    createdAt: "2026-01-01T00:00:00Z",
};

describe("useUsers", () => {
    beforeEach(() => vi.clearAllMocks());

    it("fetches paginated user list", async () => {
        vi.mocked(api.apiGet).mockResolvedValue([mockUser]);
        const { result } = renderHook(() => useUsers(), {
            wrapper: createWrapper(),
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([mockUser]);
        expect(api.apiGet).toHaveBeenCalledWith("/users?page=1&limit=20");
    });

    it("accepts custom page and limit", async () => {
        vi.mocked(api.apiGet).mockResolvedValue([]);
        const { result } = renderHook(() => useUsers(2, 10), {
            wrapper: createWrapper(),
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(api.apiGet).toHaveBeenCalledWith("/users?page=2&limit=10");
    });

    it("enters error state on API failure", async () => {
        vi.mocked(api.apiGet).mockRejectedValue(new Error("Forbidden"));
        const { result } = renderHook(() => useUsers(), {
            wrapper: createWrapper(),
        });
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

describe("useUpdateUserRole", () => {
    beforeEach(() => vi.clearAllMocks());

    it("calls PATCH /users/:id/role with new role", async () => {
        vi.mocked(api.apiPatch).mockResolvedValue({
            ...mockUser,
            role: "moderator",
        });
        const { result } = renderHook(() => useUpdateUserRole(), {
            wrapper: createWrapper(),
        });
        await act(async () => {
            await result.current.mutateAsync({
                id: "user-1",
                role: "moderator",
            });
        });
        expect(api.apiPatch).toHaveBeenCalledWith("/users/user-1/role", {
            role: "moderator",
        });
    });

    it("surfaces mutation error on forbidden role change", async () => {
        vi.mocked(api.apiPatch).mockRejectedValue(new Error("Forbidden"));
        const { result } = renderHook(() => useUpdateUserRole(), {
            wrapper: createWrapper(),
        });
        await act(async () => {
            await result.current
                .mutateAsync({ id: "user-1", role: "admin" })
                .catch(() => {});
        });
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});
