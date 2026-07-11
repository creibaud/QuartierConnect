import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@workspace/ui/components/button";

type RouterFallbackPageProps = {
    badge: string;
    title: string;
    description: string;
};

function RouterFallbackPage({
    badge,
    title,
    description,
}: RouterFallbackPageProps) {
    const { t } = useTranslation();
    return (
        <main className="flex min-h-svh flex-col items-center justify-center gap-3 bg-background px-6 text-center">
            <p className="text-sm font-semibold tracking-wide text-primary uppercase">
                {badge}
            </p>
            <h1 className="text-3xl font-semibold text-foreground">{title}</h1>
            <p className="max-w-md text-muted-foreground">{description}</p>
            <Button asChild className="mt-3">
                <Link to="/">{t("pages.errors.backHome")}</Link>
            </Button>
        </main>
    );
}

export function NotFoundPage() {
    const { t } = useTranslation();
    return (
        <RouterFallbackPage
            badge={t("pages.errors.notFound.badge")}
            title={t("pages.errors.notFound.title")}
            description={t("pages.errors.notFound.description")}
        />
    );
}

export function RouterErrorPage() {
    const { t } = useTranslation();
    return (
        <RouterFallbackPage
            badge={t("pages.errors.generic.badge")}
            title={t("pages.errors.generic.title")}
            description={t("pages.errors.generic.description")}
        />
    );
}
