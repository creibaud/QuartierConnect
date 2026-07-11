import { createFileRoute } from "@tanstack/react-router";
import { AdminEventsPage } from "@/features/events";

export const Route = createFileRoute("/_app/events/")({
    component: AdminEventsPage,
});
