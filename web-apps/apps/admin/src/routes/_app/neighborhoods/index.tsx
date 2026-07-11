import { createFileRoute } from "@tanstack/react-router";
import { NeighborhoodsPage } from "@/features/neighborhoods";

export const Route = createFileRoute("/_app/neighborhoods/")({
    component: NeighborhoodsPage,
});
