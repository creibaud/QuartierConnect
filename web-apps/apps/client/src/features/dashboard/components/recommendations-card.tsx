import { SparklesIcon } from "@hugeicons/core-free-icons";
import { useTranslation } from "react-i18next";
import { useRecommendations } from "@workspace/shared/lib/hooks/useRecommendations";
import { Badge } from "@workspace/ui/components/badge";
import { EmptyBlock, FeedCard, Rows } from "./feed-card";

const TYPE_LABEL: Record<string, string> = {
    service: "pages.dashboard.recoType.service",
    event: "pages.dashboard.recoType.event",
    neighbor: "pages.dashboard.recoType.neighbor",
};

export function RecommendationsCard() {
    const { t } = useTranslation();
    const { data: recommendations, isLoading } = useRecommendations();
    const top = (recommendations ?? []).slice(0, 4);

    return (
        <FeedCard
            title={t("pages.dashboard.recommendationsForYou")}
            to="/recommendations"
            icon={SparklesIcon}
        >
            {isLoading ? (
                <Rows count={3} />
            ) : top.length === 0 ? (
                <EmptyBlock
                    icon={SparklesIcon}
                    title={t("pages.dashboard.noRecommendations")}
                    subtitle={t("pages.dashboard.noRecommendationsHint")}
                />
            ) : (
                <ul className="space-y-3">
                    {top.map((r) => (
                        <li key={r.id} className="space-y-1">
                            <div className="flex items-center justify-between gap-2">
                                <span className="truncate text-sm font-medium">{r.name}</span>
                                <Badge variant="secondary" className="shrink-0 text-[10px]">
                                    {t(TYPE_LABEL[r.type] ?? "pages.dashboard.recoType.service")}
                                </Badge>
                            </div>
                            <p className="text-muted-foreground line-clamp-1 text-xs">{r.reason}</p>
                        </li>
                    ))}
                </ul>
            )}
        </FeedCard>
    );
}
