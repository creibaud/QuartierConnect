import { createFileRoute } from "@tanstack/react-router";
import { AdminDashboardPage } from "@/features/dashboard";

export const Route = createFileRoute("/_app/dashboard/")({
    component: AdminDashboardPage,
});
