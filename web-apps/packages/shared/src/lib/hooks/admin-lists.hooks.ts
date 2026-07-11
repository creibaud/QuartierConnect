import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiGetPage, type Page } from "../api";

export interface AdminListParams {
    page: number;
    limit: number;
    search?: string;
    sort?: string;
    order?: "asc" | "desc";
}

function buildQuery(params: object): string {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== "" && value !== "all") {
            qs.set(key, String(value));
        }
    }
    return qs.toString();
}

function useAdminList<T>(key: string, path: string, params: object) {
    const query = useQuery<Page<T>>({
        queryKey: [key, params],
        queryFn: () => apiGetPage<T>(`${path}?${buildQuery(params)}`),
        placeholderData: keepPreviousData,
    });
    return {
        rows: query.data?.data ?? [],
        total: query.data?.total ?? 0,
        totalPages: query.data?.totalPages ?? 1,
        isLoading: query.isLoading,
        isFetching: query.isFetching,
        error: query.error,
    };
}

export const useAdminIncidents = (
    params: AdminListParams & { status?: string; category?: string },
) => useAdminList("admin-incidents", "/incidents", params);

export const useAdminServices = (
    params: AdminListParams & {
        category?: string;
        type?: string;
        direction?: string;
    },
) => useAdminList("admin-services", "/services", params);

export const useAdminEvents = (
    params: AdminListParams & { category?: string; date?: string },
) => useAdminList("admin-events", "/events", params);

export const useAdminNeighborhoods = (params: AdminListParams) =>
    useAdminList("admin-neighborhoods", "/neighborhoods", params);

export const useAdminCommunityVotes = (
    params: AdminListParams & { status?: string },
) => useAdminList("admin-community-votes", "/community-votes", params);

export const useAdminUsers = (params: AdminListParams & { role?: string }) =>
    useAdminList("admin-users", "/users", params);
