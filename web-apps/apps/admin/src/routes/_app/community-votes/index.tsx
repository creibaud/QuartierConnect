import { createFileRoute } from "@tanstack/react-router";
import { CommunityVotesPage } from "@/features/community-votes";

export const Route = createFileRoute("/_app/community-votes/")({
    component: CommunityVotesPage,
});
