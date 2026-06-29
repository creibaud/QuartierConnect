import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@workspace/shared/lib/api";
import type { NeighborhoodStatus } from "../lib/address-state";

const NEIGHBORHOOD_STATUS_KEY = ["neighborhood", "status"] as const;

export async function fetchNeighborhoodStatus(): Promise<NeighborhoodStatus> {
    return apiGet<NeighborhoodStatus>("/users/me/neighborhood-status");
}

export function useNeighborhoodStatus() {
    return useQuery<NeighborhoodStatus>({
        queryKey: NEIGHBORHOOD_STATUS_KEY,
        queryFn: fetchNeighborhoodStatus,
        staleTime: 30_000,
    });
}

export function useSubmitAddress() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (address: string) =>
            apiPost<void>("/users/me/address", { address }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: NEIGHBORHOOD_STATUS_KEY });
        },
    });
}
