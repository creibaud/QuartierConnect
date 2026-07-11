import { useQuery } from "@tanstack/react-query";
import { fetchIncidents } from "@workspace/shared/lib/api/incidents.api";
import { RECENT_INCIDENTS_LIMIT } from "../lib/constants";

export function useRecentIncidents() {
    return useQuery({
        queryKey: ["incidents", "recent", RECENT_INCIDENTS_LIMIT],
        queryFn: () => fetchIncidents(1, RECENT_INCIDENTS_LIMIT),
        staleTime: 30_000,
    });
}
