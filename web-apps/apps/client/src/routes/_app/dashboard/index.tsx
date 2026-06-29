import { createFileRoute } from "@tanstack/react-router";
import { DashboardPage } from "@/features/dashboard/pages/dashboard-page";

export const Route = createFileRoute("/_app/dashboard/")({
    component: DashboardPage,
});
