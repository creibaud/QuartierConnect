import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/$locale/_authenticated")({
    beforeLoad: ({ params }) => {
        const token = localStorage.getItem("accessToken");
        const role = localStorage.getItem("userRole");
        if (!token || role !== "admin") {
            throw redirect({
                to: "/$locale/login",
                params: { locale: params.locale },
            });
        }
    },
    component: () => <Outlet />,
});
