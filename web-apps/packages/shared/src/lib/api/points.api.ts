import { apiGet, apiPost } from "../api";
import type { PointBalance, PointTransaction, TransferResult } from "../types";

export function fetchPointBalance(): Promise<PointBalance> {
    return apiGet<PointBalance>("/points/balance");
}

export function fetchPointsHistory(
    page = 1,
    limit = 20,
): Promise<PointTransaction[]> {
    const qs = new URLSearchParams({
        page: String(page),
        limit: String(limit),
    });
    return apiGet<PointTransaction[]>(`/points/history?${qs}`);
}

export function transferPoints(data: {
    recipientId: string;
    amount: number;
    note?: string;
}): Promise<TransferResult> {
    return apiPost<TransferResult>("/points/transfer", data);
}
