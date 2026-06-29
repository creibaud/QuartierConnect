import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@workspace/shared/lib/api";

export interface UncoveredResident {
    userId: string;
    firstName: string;
    lat: number;
    lng: number;
    address: string;
}

export function useUncoveredAddresses() {
    return useQuery({
        queryKey: ["admin", "uncovered-addresses"],
        queryFn: () =>
            apiGet<UncoveredResident[]>("/neighborhoods/uncovered-addresses"),
        staleTime: 30_000,
    });
}
