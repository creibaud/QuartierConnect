import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@workspace/ui/components/button";
import {
    Card,
    CardAction,
    CardContent,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components/card";

export function ListCard({
    title,
    seeAllTo,
    children,
}: {
    title: string;
    seeAllTo: string;
    children: ReactNode;
}) {
    const { t } = useTranslation();
    return (
        <Card className="gap-3">
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardAction>
                    <Button asChild variant="ghost" size="sm">
                        <Link to={seeAllTo}>
                            {t("adminPages.dashboard.seeAll")}
                        </Link>
                    </Button>
                </CardAction>
            </CardHeader>
            <CardContent>{children}</CardContent>
        </Card>
    );
}
