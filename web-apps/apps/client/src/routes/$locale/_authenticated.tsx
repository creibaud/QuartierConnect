import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/$locale/_authenticated")({
    beforeLoad: ({ context, params }) => {
        if (!context.auth.accessToken) {
            throw redirect({
                to: "/$locale/login",
                params: { locale: params.locale },
            });
        }
    },
    component: () => <Outlet />,
});
