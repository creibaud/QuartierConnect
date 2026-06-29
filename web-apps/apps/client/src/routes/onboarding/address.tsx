import { createFileRoute, redirect } from "@tanstack/react-router";
import { ensureAuthenticated } from "@workspace/shared/lib/api";
import { AddressGatePage } from "@/features/onboarding/pages/address-gate-page";

export const Route = createFileRoute("/onboarding/address")({
    beforeLoad: async () => {
        const user = await ensureAuthenticated();
        if (!user) throw redirect({ to: "/login" });
    },
    component: AddressGatePage,
});
