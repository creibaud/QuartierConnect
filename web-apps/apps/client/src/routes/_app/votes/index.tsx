import { createFileRoute } from "@tanstack/react-router";
import { VotesPage } from "@/features/votes";

export const Route = createFileRoute("/_app/votes/")({
    component: VotesPage,
});
