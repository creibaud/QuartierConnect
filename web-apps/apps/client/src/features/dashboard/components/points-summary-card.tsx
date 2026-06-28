import { Coins01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslation } from "react-i18next";
import { usePointBalance } from "@workspace/shared/lib/hooks/points.hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";

export function PointsSummaryCard() {
    const { t } = useTranslation();
    const { data: balance } = usePointBalance();

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <HugeiconsIcon icon={Coins01Icon} className="text-primary size-5" />
                    {t("pages.dashboard.yourPoints")}
                </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-center">
                <p className="font-heading text-5xl font-semibold tabular-nums">
                    {balance?.balance ?? "—"}
                </p>
                <p className="text-muted-foreground mt-1 text-sm">
                    {t("pages.dashboard.participationPoints")}
                </p>
            </CardContent>
        </Card>
    );
}
