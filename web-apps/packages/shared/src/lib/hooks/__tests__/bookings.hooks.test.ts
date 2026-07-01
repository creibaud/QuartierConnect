import { createElement } from "react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { apiGet, apiPost } from "../../api";
import {
    useAcceptBooking,
    useCreateBooking,
    useMyBookings,
} from "../useBookings";

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

const mockBooking = {
    _id: "bk-1",
    serviceId: "svc-1",
    initiatorId: "user-2",
    payerId: "user-2",
    payeeId: "user-1",
    pointsAmount: 20,
    status: "pending" as const,
    contractId: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
};

describe("useMyBookings", () => {
    beforeEach(() => vi.clearAllMocks());

    it("fetches the booking list", async () => {
        vi.mocked(apiGet).mockResolvedValue([mockBooking]);
        const { result } = renderHook(() => useMyBookings(), {
            wrapper: createWrapper(),
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([mockBooking]);
        expect(apiGet).toHaveBeenCalledWith("/bookings");
    });
});

describe("useCreateBooking", () => {
    beforeEach(() => vi.clearAllMocks());

    it("POSTs /bookings with serviceId", async () => {
        vi.mocked(apiPost).mockResolvedValue(mockBooking);
        const { result } = renderHook(() => useCreateBooking(), {
            wrapper: createWrapper(),
        });
        result.current.mutate({ serviceId: "svc-1" });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(apiPost).toHaveBeenCalledWith("/bookings", { serviceId: "svc-1" });
    });
});

describe("useAcceptBooking", () => {
    beforeEach(() => vi.clearAllMocks());

    it("POSTs /bookings/:id/accept", async () => {
        vi.mocked(apiPost).mockResolvedValue({
            ...mockBooking,
            status: "accepted",
            contractId: "ct-1",
        });
        const { result } = renderHook(() => useAcceptBooking(), {
            wrapper: createWrapper(),
        });
        result.current.mutate("bk-1");
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(apiPost).toHaveBeenCalledWith("/bookings/bk-1/accept");
    });
});
