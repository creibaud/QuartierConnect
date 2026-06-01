import { useHead } from "@unhead/react";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { Toaster } from "sonner";

const SITE_NAME = "QuartierConnect Admin";

function RootLayout() {
    useHead({
        titleTemplate: (title) =>
            title ? `${title} · ${SITE_NAME}` : SITE_NAME,
        htmlAttrs: { lang: "fr" },
        meta: [
            {
                name: "description",
                content:
                    "Console d'administration QuartierConnect — gestion des quartiers, incidents, services et résidents.",
            },
            { name: "theme-color", content: "#0a0a0a" },
        ],
    });

    return (
        <>
            <Outlet />
            <Toaster richColors position="top-right" />
        </>
    );
}

export const Route = createRootRoute({
    component: RootLayout,
});
