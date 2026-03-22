import { useEffect } from "react";
import { useLocale } from "react-intlayer";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/$locale")({
    beforeLoad: ({ params, location }) => {
        if (SUPPORTED_LOCALES.has(params.locale)) {
            return;
        }

        const pathSegments = location.pathname.split("/").filter(Boolean);
        if (pathSegments.length === 0) {
            throw redirect({
                to: "/$locale",
                params: { locale: DEFAULT_LOCALE },
            });
        }

        pathSegments[0] = DEFAULT_LOCALE;
        throw redirect({
            href: `/${pathSegments.join("/")}${location.search}${location.hash}`,
        });
    },
    component: LocaleLayout,
});

const DEFAULT_LOCALE = "fr";
const SUPPORTED_LOCALES = new Set<string>(["en", "fr"]);

function LocaleLayout() {
    const { locale: localeParam } = Route.useParams();
    const { setLocale } = useLocale();

    useEffect(() => {
        if (localeParam && SUPPORTED_LOCALES.has(localeParam)) {
            setLocale(localeParam);
        }
    }, [localeParam, setLocale]);

    return <Outlet />;
}
