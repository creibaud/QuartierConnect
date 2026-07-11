import { useTranslation } from "react-i18next";
import { Coins01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { usePointBalance } from "@workspace/shared/lib/hooks/points.hooks";
import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components/card";

export function PointBalanceCard() {
    const { t } = useTranslation();
    const { data: balance } = usePointBalance();

    return (
        <Card>
            <CardHeader>
                <CardDescription>
                    {t("pages.points.balanceTitle")}
                </CardDescription>
                <CardTitle className="flex items-center gap-2 text-3xl tabular-nums">
                    <HugeiconsIcon icon={Coins01Icon} />
                    {balance?.balance ?? 0}
                    <span className="text-muted-foreground text-base font-normal">
                        {t("pages.points.balanceUnit")}
                    </span>
                </CardTitle>
            </CardHeader>
        </Card>
    );
}
