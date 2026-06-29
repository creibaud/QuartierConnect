import { createFileRoute } from "@tanstack/react-router";
import { UncoveredAddressesPage } from "@/features/uncovered-addresses/pages/uncovered-addresses-page";

export const Route = createFileRoute("/_app/uncovered-addresses/")({
    component: UncoveredAddressesPage,
});
