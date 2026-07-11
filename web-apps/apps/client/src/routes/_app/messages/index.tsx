import { createFileRoute } from "@tanstack/react-router";
import { MessagesPage } from "@/features/messages";

export const Route = createFileRoute("/_app/messages/")({
    component: MessagesRoute,
    validateSearch: (
        search: Record<string, unknown>,
    ): { conversation?: string } => ({
        conversation:
            typeof search.conversation === "string"
                ? search.conversation
                : undefined,
    }),
});

function MessagesRoute() {
    const { conversation } = Route.useSearch();
    return <MessagesPage conversation={conversation} />;
}
