import { createElement } from "react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import * as api from "../../api/points.api";
import {
    usePointBalance,
    usePointsHistory,
    useTransferPoints,
} from "../points.hooks";

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

describe("usePointsHistory", () => {
    beforeEach(() => vi.clearAllMocks());

    it("returns the transaction history", async () => {
        const transactions = [
            {
                id: "tx-1",
                senderId: "user-a",
                recipientId: "user-b",
                amount: 10,
                note: "Thanks",
                createdAt: "2026-06-01T10:00:00.000Z",
            },
        ];
        vi.mocked(api.fetchPointsHistory).mockResolvedValue(transactions);
        const { result } = renderHook(() => usePointsHistory(), {
            wrapper: createWrapper(),
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(transactions);
    });

    it("requests the given page and limit", async () => {
        vi.mocked(api.fetchPointsHistory).mockResolvedValue([]);
        const { result } = renderHook(() => usePointsHistory(2, 5), {
            wrapper: createWrapper(),
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(api.fetchPointsHistory).toHaveBeenCalledWith(2, 5);
    });
});

describe("useTransferPoints", () => {
    beforeEach(() => vi.clearAllMocks());

    it("transfers points and resolves with the result", async () => {
        const transferResult = {
            transaction: {
                id: "tx-1",
                senderId: "user-a",
                recipientId: "user-b",
                amount: 10,
                note: null,
                createdAt: "2026-06-01T10:00:00.000Z",
            },
            senderBalance: 90,
            recipientBalance: 60,
        };
        vi.mocked(api.transferPoints).mockResolvedValue(transferResult);
        const { result } = renderHook(() => useTransferPoints(), {
            wrapper: createWrapper(),
        });
        result.current.mutate({ recipientId: "user-b", amount: 10 });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(api.transferPoints).toHaveBeenCalledWith({
            recipientId: "user-b",
            amount: 10,
        });
        expect(result.current.data).toEqual(transferResult);
    });

    it("enters error state when the transfer fails", async () => {
        vi.mocked(api.transferPoints).mockRejectedValue(
            new Error("Insufficient balance"),
        );
        const { result } = renderHook(() => useTransferPoints(), {
            wrapper: createWrapper(),
        });
        result.current.mutate({ recipientId: "user-b", amount: 999 });
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});
