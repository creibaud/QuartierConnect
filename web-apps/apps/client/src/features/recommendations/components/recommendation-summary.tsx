import { useTranslation } from "react-i18next";
import { HugeiconsIcon } from "@hugeicons/react";
import type { Recommendation } from "@workspace/shared/lib/types";
import { Badge } from "@workspace/ui/components/badge";
import { TYPE_ICON, TYPE_VARIANTS } from "../lib/recommendation-meta";

export function RecommendationSummary({
    recommendation,
}: {
    recommendation: Recommendation;
}) {
    const { t } = useTranslation();

    return (
        <>
            <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
                <HugeiconsIcon
                    icon={TYPE_ICON[recommendation.type]}
                    className="size-5"
                />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium">{recommendation.name}</h3>
                    <Badge
                        variant={TYPE_VARIANTS[recommendation.type]}
                        className="shrink-0"
                    >
                        {t(`recommendations.types.${recommendation.type}`)}
                    </Badge>
                </div>
                <p className="text-muted-foreground text-sm">
                    {t(`recommendations.reasons.${recommendation.reason}`)}
                </p>
            </div>
        </>
    );
}
