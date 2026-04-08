import { apiGet } from "../api";
import type { PointBalance } from "../types";

export function fetchPointBalance(): Promise<PointBalance> {
    return apiGet<PointBalance>("/points/balance");
}
