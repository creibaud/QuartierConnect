import { useHead } from "@unhead/react";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { Toaster } from "sonner";

const SITE_NAME = "QuartierConnect";

function RootLayout() {
    useHead({
        titleTemplate: (title) =>
            title ? `${title} · ${SITE_NAME}` : SITE_NAME,
        htmlAttrs: { lang: "fr" },
        meta: [
            {
                name: "description",
                content:
                    "QuartierConnect — votre espace résident : incidents, événements, services et vie de quartier.",
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
