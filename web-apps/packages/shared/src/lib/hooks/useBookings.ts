import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "../api";
import type { Booking } from "../types";

export function useMyBookings() {
    return useQuery<Booking[]>({
        queryKey: ["bookings"],
        queryFn: () => apiGet<Booking[]>("/bookings"),
    });
}

export function useBooking(id: string) {
    return useQuery<Booking>({
        queryKey: ["bookings", id],
        queryFn: () => apiGet<Booking>(`/bookings/${id}`),
        enabled: !!id,
    });
}

export function useCreateBooking() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { serviceId: string }) =>
            apiPost<Booking>("/bookings", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["bookings"] });
        },
    });
}

function useBookingAction(action: "accept" | "decline" | "cancel") {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) =>
            apiPost<Booking>(`/bookings/${id}/${action}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["bookings"] });
            queryClient.invalidateQueries({ queryKey: ["contracts"] });
        },
    });
}

export function useAcceptBooking() {
    return useBookingAction("accept");
}

export function useDeclineBooking() {
    return useBookingAction("decline");
}

export function useCancelBooking() {
    return useBookingAction("cancel");
}
