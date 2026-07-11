import { createFileRoute } from "@tanstack/react-router";
import { RecommendationsPage } from "@/features/recommendations";

export const Route = createFileRoute("/_app/recommendations/")({
    component: RecommendationsPage,
});
