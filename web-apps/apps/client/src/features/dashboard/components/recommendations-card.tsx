import { SparklesIcon } from "@hugeicons/core-free-icons";
import { useTranslation } from "react-i18next";
import { useRecommendations } from "@workspace/shared/lib/hooks/useRecommendations";
import { EmptyBlock, FeedCard, Rows } from "./feed-card";

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
                <EmptyBlock icon={SparklesIcon} text={t("pages.dashboard.noRecommendations")} />
            ) : (
                <ul className="space-y-2.5">
                    {top.map((r) => (
                        <li key={r.id} className="space-y-0.5">
                            <p className="truncate text-sm font-medium">{r.name}</p>
                            <p className="text-muted-foreground truncate text-xs">{r.reason}</p>
                        </li>
                    ))}
                </ul>
            )}
        </FeedCard>
    );
}
