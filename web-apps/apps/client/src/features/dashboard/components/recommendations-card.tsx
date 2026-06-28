import { SparklesIcon } from "@hugeicons/core-free-icons";
import { useTranslation } from "react-i18next";
import { useRecommendations } from "@workspace/shared/lib/hooks/useRecommendations";
import { Badge } from "@workspace/ui/components/badge";
import { Item, ItemGroup, ItemContent, ItemTitle, ItemDescription, ItemActions } from "@workspace/ui/components/item";
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
                <ItemGroup>
                    {top.map((r) => (
                        <Item key={r.id} variant="outline" size="sm">
                            <ItemContent>
                                <ItemTitle>{r.name}</ItemTitle>
                                <ItemDescription>{r.reason}</ItemDescription>
                            </ItemContent>
                            <ItemActions>
                                <Badge variant="secondary" className="text-[10px]">
                                    {t(TYPE_LABEL[r.type] ?? "pages.dashboard.recoType.service")}
                                </Badge>
                            </ItemActions>
                        </Item>
                    ))}
                </ItemGroup>
            )}
        </FeedCard>
    );
}
