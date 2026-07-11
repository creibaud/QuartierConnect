import { createFileRoute } from "@tanstack/react-router";
import { AdminIncidentsPage } from "@/features/incidents";

export const Route = createFileRoute("/_app/incidents/")({
    component: AdminIncidentsPage,
});
