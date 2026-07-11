import { createFileRoute } from "@tanstack/react-router";
import { ContractsPage } from "@/features/contracts";

export const Route = createFileRoute("/_app/contracts/")({
    component: ContractsPage,
});
