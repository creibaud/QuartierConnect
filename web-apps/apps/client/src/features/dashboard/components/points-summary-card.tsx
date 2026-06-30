import { ArrowRight01Icon, Coins01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { usePointBalance } from "@workspace/shared/lib/hooks/points.hooks";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components/card";

export function PointsSummaryCard() {
    const { t } = useTranslation();
    const { data: balance } = usePointBalance();

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <HugeiconsIcon
                        icon={Coins01Icon}
                        className="text-primary size-5"
                    />
                    {t("pages.dashboard.yourPoints")}
                </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-between gap-4">
                <div className="bg-primary/5 flex items-center gap-4 rounded-lg p-4">
                    <span className="bg-primary/10 text-primary flex size-12 shrink-0 items-center justify-center rounded-full">
                        <HugeiconsIcon icon={Coins01Icon} className="size-6" />
                    </span>
                    <div>
                        <p className="font-heading text-4xl font-semibold tabular-nums leading-none">
                            {balance?.balance ?? "—"}
                        </p>
                        <p className="text-muted-foreground mt-1 text-sm">
                            {t("pages.dashboard.participationPoints")}
                        </p>
                    </div>
                </div>
                <Link
                    to="/points"
                    className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
                >
                    {t("pages.dashboard.viewPointsHistory")}
                    <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
                </Link>
            </CardContent>
        </Card>
    );
}
