import { createFileRoute, useParams } from "@tanstack/react-router";
import { IncidentDetailPage } from "@/features/incidents";

export const Route = createFileRoute("/_app/incidents/$id")({
    component: IncidentDetailRoute,
});

function IncidentDetailRoute() {
    const { id } = useParams({ from: "/_app/incidents/$id" });
    return <IncidentDetailPage id={id} />;
}
