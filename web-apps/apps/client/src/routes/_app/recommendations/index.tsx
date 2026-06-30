import { useTranslation } from "react-i18next";
import { SparklesIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute } from "@tanstack/react-router";
import { useRecommendations } from "@workspace/shared/lib/hooks/useRecommendations";
import type { Recommendation } from "@workspace/shared/lib/types";
import { Badge } from "@workspace/ui/components/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components/card";
import { DataState } from "@workspace/ui/components/data-state";
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@workspace/ui/components/empty";
import { PageHeader } from "@workspace/ui/components/page-header";
import { Skeleton } from "@workspace/ui/components/skeleton";

const TYPE_VARIANTS: Record<
    Recommendation["type"],
    "default" | "secondary" | "outline"
> = {
    service: "default",
    event: "secondary",
    neighbor: "outline",
};

export const Route = createFileRoute("/_app/recommendations/")({
    component: RecommendationsPage,
});

function RecommendationsPage() {
    const { t } = useTranslation();
    const { data, isLoading, isError, refetch } = useRecommendations();
    const recommendations = data ?? [];

    return (
        <div className="p-6 md:p-8">
            <div className="mx-auto flex max-w-7xl flex-col gap-6">
                <PageHeader
                    title={t("recommendations.title")}
                    description={t("recommendations.description")}
                />

                <DataState
                    loading={isLoading}
                    error={isError ? true : undefined}
                    isEmpty={recommendations.length === 0}
                    onRetry={() => void refetch()}
                    errorTitle={t("recommendations.loadError")}
                    skeleton={
                        <div className="flex flex-col gap-3">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton
                                    key={i}
                                    className="h-24 w-full rounded-xl"
                                />
                            ))}
                        </div>
                    }
                    empty={
                        <Empty className="border">
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <HugeiconsIcon icon={SparklesIcon} />
                                </EmptyMedia>
                                <EmptyTitle>
                                    {t("recommendations.empty")}
                                </EmptyTitle>
                                <EmptyDescription>
                                    {t("recommendations.emptyDescription")}
                                </EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    }
                >
                    <div className="flex flex-col gap-3">
                        {recommendations.map((recommendation) => (
                            <Card
                                key={`${recommendation.type}-${recommendation.id}`}
                            >
                                <CardHeader>
                                    <div className="flex items-start justify-between gap-2">
                                        <CardTitle className="text-base">
                                            {recommendation.name}
                                        </CardTitle>
                                        <Badge
                                            variant={
                                                TYPE_VARIANTS[
                                                    recommendation.type
                                                ]
                                            }
                                            className="shrink-0"
                                        >
                                            {t(
                                                `recommendations.types.${recommendation.type}`,
                                            )}
                                        </Badge>
                                    </div>
                                    <CardDescription>
                                        {recommendation.reason}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground text-xs tabular-nums">
                                        {t("recommendations.scoreLabel", {
                                            score: recommendation.score,
                                        })}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </DataState>
            </div>
        </div>
    );
}
