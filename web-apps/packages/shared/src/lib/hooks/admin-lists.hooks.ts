import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiGetPage, type Page } from "../api";
import type { Event, Incident, Neighborhood, Service, User } from "../types";

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

// The server clamps limit to 100, so a map that wants every matching pin has to
// walk the pages itself. The cap stops a runaway loop; 5000 points is already
// past what a map can usefully show.
const MAP_PAGE_SIZE = 100;
const MAP_PAGE_CAP = 50;
// Fetch the rest of the pages in parallel but bounded, so a wide map doesn't
// open dozens of requests at once.
const MAP_FETCH_CONCURRENCY = 6;

async function fetchAllPages<T>(path: string, params: object): Promise<T[]> {
    const query = (page: number) =>
        apiGetPage<T>(
            `${path}?${buildQuery({ ...params, page, limit: MAP_PAGE_SIZE })}`,
        );
    const first = await query(1);
    const lastPage = Math.min(first.totalPages, MAP_PAGE_CAP);
    const restPages = [];
    for (let page = 2; page <= lastPage; page++) restPages.push(page);

    const pages: T[][] = [first.data];
    for (let i = 0; i < restPages.length; i += MAP_FETCH_CONCURRENCY) {
        const batch = restPages.slice(i, i + MAP_FETCH_CONCURRENCY);
        const results = await Promise.all(batch.map((page) => query(page)));
        for (const result of results) pages.push(result.data);
    }
    return pages.flat();
}

function useAdminMap<T>(key: string, path: string, params: object) {
    const query = useQuery<T[]>({
        queryKey: [key, params],
        queryFn: () => fetchAllPages<T>(path, params),
        placeholderData: keepPreviousData,
    });
    return {
        rows: query.data ?? [],
        isLoading: query.isLoading,
        error: query.error,
    };
}

export const useAdminIncidents = (
    params: AdminListParams & { status?: string; category?: string },
) => useAdminList<Incident>("admin-incidents", "/incidents", params);

export const useAdminIncidentsForMap = (params: {
    status?: string;
    category?: string;
}) => useAdminMap<Incident>("admin-incidents-map", "/incidents", params);

export const useAdminServices = (
    params: AdminListParams & {
        category?: string;
        type?: string;
        direction?: string;
    },
) => useAdminList<Service>("admin-services", "/services", params);

export const useAdminServicesForMap = (params: {
    search?: string;
    category?: string;
}) => useAdminMap<Service>("admin-services-map", "/services", params);

export const useAdminEvents = (
    params: AdminListParams & { category?: string; date?: string },
) => useAdminList<Event>("admin-events", "/events", params);

export const useAdminNeighborhoods = (params: AdminListParams) =>
    useAdminList<Neighborhood>("admin-neighborhoods", "/neighborhoods", params);

export const useAdminCommunityVotes = (
    params: AdminListParams & { status?: string },
) => useAdminList("admin-community-votes", "/community-votes", params);

export const useAdminUsers = (params: AdminListParams & { role?: string }) =>
    useAdminList<User>("admin-users", "/users", params);
