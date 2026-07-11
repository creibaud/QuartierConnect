import { createFileRoute } from "@tanstack/react-router";
import { AdminServicesPage } from "@/features/services";

export const Route = createFileRoute("/_app/services/")({
    component: AdminServicesPage,
});
