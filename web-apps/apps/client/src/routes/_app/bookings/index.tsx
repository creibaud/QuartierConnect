import { createFileRoute } from "@tanstack/react-router";
import { BookingsPage } from "@/features/bookings/bookings-page";

export const Route = createFileRoute("/_app/bookings/")({
    component: BookingsPage,
});
