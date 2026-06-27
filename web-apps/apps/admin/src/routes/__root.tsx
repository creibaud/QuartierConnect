import { useHead } from "@unhead/react";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Toaster } from "sonner";

const SITE_NAME = "QuartierConnect Admin";

function RootLayout() {
    const { t } = useTranslation();
    useHead({
        titleTemplate: (title) =>
            title ? `${title} · ${SITE_NAME}` : SITE_NAME,
        htmlAttrs: { lang: "fr" },
        meta: [
            {
                name: "description",
                content: t("adminPages.meta.description"),
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
