import { ArrowDown01Icon, ArrowUp01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { getCurrentUser } from "@workspace/shared/lib/auth";
import {
    useIncident,
    useUpdateIncidentStatus,
} from "@workspace/shared/lib/hooks/incidents.hooks";
import {
    useCastVote,
    useVoteScore,
} from "@workspace/shared/lib/hooks/useVotes";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components/card";
import { DataState } from "@workspace/ui/components/data-state";
import { PageHeader } from "@workspace/ui/components/page-header";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { toast } from "sonner";

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
    open: "default",
    in_progress: "secondary",
    resolved: "outline",
};

const NEXT_STATUS_VALUES: Record<
    string,
    { value: "open" | "in_progress" | "resolved"; labelKey: string } | null
> = {
    open: {
        value: "in_progress",
        labelKey: "pages.incidentDetail.moveToInProgress",
    },
    in_progress: {
        value: "resolved",
        labelKey: "pages.incidentDetail.markResolved",
    },
    resolved: null,
};

export const Route = createFileRoute("/_app/incidents/$id")({
    component: IncidentDetailPage,
});

function IncidentDetailPage() {
    const { t } = useTranslation();
    const { id } = Route.useParams();
    const user = getCurrentUser();
    const statusLabels: Record<string, string> = {
        open: t("incidents.status.open"),
        in_progress: t("incidents.status.in_progress"),
        resolved: t("incidents.status.resolved"),
    };

    const { data: incident, isLoading, isError, refetch } = useIncident(id);
    const { data: voteScore } = useVoteScore(id, "incident");
    const castVote = useCastVote();
    const updateStatus = useUpdateIncidentStatus();

    const canTransition = user?.role === "moderator" || user?.role === "admin";

    return (
        <div className="p-6 md:p-8">
            <div className="mx-auto flex max-w-5xl flex-col gap-6">
                <PageHeader
                    title={incident?.title ?? t("pages.incidentDetail.title")}
                    description={
                        incident
                            ? t("pages.incidentDetail.reportedOn", {
                                  date: new Date(
                                      incident.createdAt,
                                  ).toLocaleDateString("fr-FR"),
                              })
                            : undefined
                    }
                    actions={
                        incident ? (
                            <Badge
                                variant={
                                    STATUS_VARIANTS[incident.status] ?? "outline"
                                }
                            >
                                {statusLabels[incident.status] ??
                                    incident.status}
                            </Badge>
                        ) : undefined
                    }
                />

                <DataState
                    loading={isLoading}
                    error={isError || (!isLoading && !incident) ? true : undefined}
                    onRetry={() => refetch()}
                    errorTitle={t("pages.incidentDetail.notFound")}
                    skeleton={
                        <Card>
                            <CardHeader>
                                <Skeleton className="h-6 w-3/4" />
                                <Skeleton className="mt-2 h-4 w-1/4" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-20 w-full" />
                            </CardContent>
                        </Card>
                    }
                >
                    {incident && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">
                                    {t("incidents.fields.description")}
                                </CardTitle>
                                <CardDescription>
                                    {t("pages.incidentDetail.reportDetail")}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {incident.description ? (
                                    <p className="text-sm">
                                        {incident.description}
                                    </p>
                                ) : (
                                    <p className="text-muted-foreground text-sm">
                                        {t("pages.incidentDetail.noDescription")}
                                    </p>
                                )}

                                <div className="flex items-center gap-3 border-t pt-4">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={castVote.isPending}
                                        onClick={() =>
                                            castVote.mutate(
                                                {
                                                    targetId: id,
                                                    targetType: "incident",
                                                    voteType: "up",
                                                },
                                                {
                                                    onError: () =>
                                                        toast.error(
                                                            t("votes.voteError"),
                                                        ),
                                                },
                                            )
                                        }
                                    >
                                        <HugeiconsIcon icon={ArrowUp01Icon} />
                                        {voteScore?.breakdown?.up ?? 0}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={castVote.isPending}
                                        onClick={() =>
                                            castVote.mutate(
                                                {
                                                    targetId: id,
                                                    targetType: "incident",
                                                    voteType: "down",
                                                },
                                                {
                                                    onError: () =>
                                                        toast.error(
                                                            t("votes.voteError"),
                                                        ),
                                                },
                                            )
                                        }
                                    >
                                        <HugeiconsIcon icon={ArrowDown01Icon} />
                                        {voteScore?.breakdown?.down ?? 0}
                                    </Button>
                                    {voteScore !== undefined && (
                                        <span className="text-muted-foreground text-sm tabular-nums">
                                            {t("pages.incidentDetail.score", {
                                                score: `${
                                                    voteScore.score > 0
                                                        ? "+"
                                                        : ""
                                                }${voteScore.score}`,
                                            })}
                                        </span>
                                    )}
                                </div>

                                {canTransition &&
                                    NEXT_STATUS_VALUES[incident.status] && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={updateStatus.isPending}
                                            onClick={() =>
                                                updateStatus.mutate(
                                                    {
                                                        id,
                                                        status: NEXT_STATUS_VALUES[
                                                            incident.status
                                                        ]!.value,
                                                    },
                                                    {
                                                        onSuccess: () =>
                                                            toast.success(
                                                                t(
                                                                    "pages.incidentDetail.statusUpdated",
                                                                ),
                                                            ),
                                                        onError: () =>
                                                            toast.error(
                                                                t(
                                                                    "pages.incidentDetail.statusUpdateError",
                                                                ),
                                                            ),
                                                    },
                                                )
                                            }
                                        >
                                            {updateStatus.isPending
                                                ? t(
                                                      "pages.incidentDetail.updating",
                                                  )
                                                : t(
                                                      NEXT_STATUS_VALUES[
                                                          incident.status
                                                      ]!.labelKey,
                                                  )}
                                        </Button>
                                    )}
                            </CardContent>
                        </Card>
                    )}
                </DataState>
            </div>
        </div>
    );
}
