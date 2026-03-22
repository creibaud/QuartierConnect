import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/$locale/_authenticated")({
    beforeLoad: ({ params }) => {
        if (!localStorage.getItem("accessToken")) {
            throw redirect({
                to: "/$locale/login",
                params: { locale: params.locale },
            });
        }
    },
    component: () => <Outlet />,
});
