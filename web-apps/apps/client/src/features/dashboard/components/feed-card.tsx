import type { ReactNode } from "react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";

export function FeedCard({
    title,
    to,
    icon,
    children,
}: {
    title: string;
    to: string;
    icon: IconSvgElement;
    children: ReactNode;
}) {
    const { t } = useTranslation();
    return (
        <Card className="h-full">
            <CardHeader>
                <div className="flex items-center justify-between gap-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <HugeiconsIcon icon={icon} className="text-primary size-5" />
                        {title}
                    </CardTitle>
                    <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground -mr-2 text-xs"
                    >
                        <Link to={to}>{t("pages.dashboard.seeAll")}</Link>
                    </Button>
                </div>
            </CardHeader>
            <CardContent>{children}</CardContent>
        </Card>
    );
}

export function Rows({ count = 3 }: { count?: number }) {
    return (
        <div className="space-y-2">
            {Array.from({ length: count }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full rounded" />
            ))}
        </div>
    );
}

export function EmptyBlock({ icon, text }: { icon: IconSvgElement; text: string }) {
    return (
        <div className="text-muted-foreground flex flex-col items-center gap-2 py-6 text-center text-sm">
            <HugeiconsIcon icon={icon} className="size-7 opacity-30" />
            {text}
        </div>
    );
}
