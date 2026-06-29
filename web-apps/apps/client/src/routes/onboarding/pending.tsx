import { createFileRoute, redirect } from "@tanstack/react-router";
import { ensureAuthenticated } from "@workspace/shared/lib/api";
import { PendingCoveragePage } from "@/features/onboarding/pages/pending-coverage-page";

export const Route = createFileRoute("/onboarding/pending")({
    beforeLoad: async () => {
        const user = await ensureAuthenticated();
        if (!user) throw redirect({ to: "/login" });
    },
    component: PendingCoveragePage,
});
