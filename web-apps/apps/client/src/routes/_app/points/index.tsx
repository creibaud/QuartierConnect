import { createFileRoute } from "@tanstack/react-router";
import { PointsPage } from "@/features/points";

export const Route = createFileRoute("/_app/points/")({
    component: PointsPage,
});
