import { createFileRoute } from "@tanstack/react-router";
import { BookingsPage, type BookingsTab } from "@/features/bookings";

export const Route = createFileRoute("/_app/bookings/")({
    validateSearch: (
        search: Record<string, unknown>,
    ): { tab?: BookingsTab } => ({
        tab:
            search.tab === "sent" || search.tab === "received"
                ? search.tab
                : undefined,
    }),
    component: BookingsRoute,
});

function BookingsRoute() {
    const { tab } = Route.useSearch();
    return <BookingsPage initialTab={tab} />;
}
