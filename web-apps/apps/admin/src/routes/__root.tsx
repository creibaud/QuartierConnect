import { useHead } from "@unhead/react";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Toaster } from "sonner";

const SITE_NAME = "QuartierConnect Admin";

function RootLayout() {
    const { t, i18n } = useTranslation();
    useHead({
        titleTemplate: (title) =>
            title ? `${title} · ${SITE_NAME}` : SITE_NAME,
        htmlAttrs: { lang: i18n.language },
        meta: [
            {
                name: "description",
                content: t("adminPages.meta.description"),
            },
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
