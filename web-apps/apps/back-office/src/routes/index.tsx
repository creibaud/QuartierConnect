import { createFileRoute, redirect } from "@tanstack/react-router";

const DEFAULT_LOCALE = "fr";

export const Route = createFileRoute("/")({
    beforeLoad: () => {
        throw redirect({
            to: "/$locale",
            params: { locale: DEFAULT_LOCALE },
        });
    },
});
