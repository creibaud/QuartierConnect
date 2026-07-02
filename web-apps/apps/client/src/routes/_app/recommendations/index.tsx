import { useTranslation } from "react-i18next";
import { Calendar01Icon, CustomerServiceIcon, SparklesIcon, UserIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { createFileRoute } from "@tanstack/react-router";
import { useRecommendations } from "@workspace/shared/lib/hooks/useRecommendations";
import type { Recommendation } from "@workspace/shared/lib/types";
import { Badge } from "@workspace/ui/components/badge";
import { Card, CardContent } from "@workspace/ui/components/card";
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

const TYPE_ICON: Record<Recommendation["type"], IconSvgElement> = {
    service: CustomerServiceIcon,
    event: Calendar01Icon,
    neighbor: UserIcon,
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
                                className="transition-colors hover:border-primary/40"
                            >
                                <CardContent className="flex items-start gap-4 p-5">
                                    <div className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
                                        <HugeiconsIcon
                                            icon={TYPE_ICON[recommendation.type]}
                                            className="size-5"
                                        />
                                    </div>
                                    <div className="min-w-0 flex-1 space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="font-medium">
                                                {recommendation.name}
                                            </h3>
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
                                        <p className="text-muted-foreground text-sm">
                                            {recommendation.reason}
                                        </p>
                                        <p className="text-muted-foreground text-xs tabular-nums">
                                            {t("recommendations.scoreLabel", {
                                                score: recommendation.score,
                                            })}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </DataState>
            </div>
        </div>
    );
}
