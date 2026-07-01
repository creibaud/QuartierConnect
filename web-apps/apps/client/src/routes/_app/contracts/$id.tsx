import { createFileRoute, useParams } from "@tanstack/react-router";
import { ContractDetailPage } from "@/features/contracts/contract-detail-page";

export const Route = createFileRoute("/_app/contracts/$id")({
    component: ContractDetailRoute,
});

function ContractDetailRoute() {
    const { id } = useParams({ from: "/_app/contracts/$id" });
    return <ContractDetailPage id={id} />;
}
