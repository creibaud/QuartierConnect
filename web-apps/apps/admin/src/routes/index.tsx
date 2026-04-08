import { createFileRoute, redirect } from "@tanstack/react-router";
import { ensureAuthenticated } from "@workspace/shared/lib/api";

export const Route = createFileRoute("/")({
    beforeLoad: async () => {
        const user = await ensureAuthenticated();
        if (user?.role === "admin") throw redirect({ to: "/dashboard" });
        throw redirect({ to: "/login", search: { forbidden: false } });
    },
    component: () => null,
});
