import { useTranslation } from "react-i18next";
import {
    ArrowDown01Icon,
    ArrowRight01Icon,
    ArrowUp01Icon,
    CheckmarkCircle02Icon,
    Tag01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { createFileRoute } from "@tanstack/react-router";
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
import { Map, Marker } from "@workspace/ui/components/map";
import { PageHeader } from "@workspace/ui/components/page-header";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { StatusBadge, statusTone } from "@workspace/ui/components/status-badge";
import { toast } from "sonner";

const NEXT_STATUS_VALUES: Record<
    string,
    {
        value: "open" | "in_progress" | "resolved";
        labelKey: string;
        icon: IconSvgElement;
    } | null
> = {
    open: {
        value: "in_progress",
        labelKey: "pages.incidentDetail.moveToInProgress",
        icon: ArrowRight01Icon,
    },
    in_progress: {
        value: "resolved",
        labelKey: "pages.incidentDetail.markResolved",
        icon: CheckmarkCircle02Icon,
    },
    resolved: null,
};

export const Route = createFileRoute("/_app/incidents/$id")({
    component: IncidentDetailPage,
});

function IncidentDetailPage() {
    const { t, i18n } = useTranslation();
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
    const nextStatus = incident ? NEXT_STATUS_VALUES[incident.status] : null;

    return (
        <div className="p-6 md:p-8">
            <div className="mx-auto flex max-w-7xl flex-col gap-6">
                <PageHeader
                    title={incident?.title ?? t("pages.incidentDetail.title")}
                    description={
                        incident
                            ? t("pages.incidentDetail.reportedOn", {
                                  date: new Date(
                                      incident.createdAt,
                                  ).toLocaleDateString(i18n.language),
                              })
                            : undefined
                    }
                    actions={
                        incident ? (
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline">
                                    <HugeiconsIcon icon={Tag01Icon} />
                                    {t(
                                        `pages.incidents.categories.${incident.category}`,
                                    )}
                                </Badge>
                                <StatusBadge tone={statusTone(incident.status)}>
                                    {statusLabels[incident.status] ??
                                        incident.status}
                                </StatusBadge>
                            </div>
                        ) : undefined
                    }
                />

                <DataState
                    loading={isLoading}
                    error={
                        isError || (!isLoading && !incident) ? true : undefined
                    }
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
                        <div className="flex flex-col gap-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">
                                        {t("incidents.fields.description")}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {incident.description ? (
                                        <p className="text-sm">
                                            {incident.description}
                                        </p>
                                    ) : (
                                        <p className="text-muted-foreground text-sm">
                                            {t(
                                                "pages.incidentDetail.noDescription",
                                            )}
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
                                                                t(
                                                                    "votes.voteError",
                                                                ),
                                                            ),
                                                    },
                                                )
                                            }
                                        >
                                            <HugeiconsIcon
                                                icon={ArrowUp01Icon}
                                            />
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
                                                                t(
                                                                    "votes.voteError",
                                                                ),
                                                            ),
                                                    },
                                                )
                                            }
                                        >
                                            <HugeiconsIcon
                                                icon={ArrowDown01Icon}
                                            />
                                            {voteScore?.breakdown?.down ?? 0}
                                        </Button>
                                        {voteScore !== undefined && (
                                            <span className="text-muted-foreground text-sm tabular-nums">
                                                {t(
                                                    "pages.incidentDetail.score",
                                                    {
                                                        score: `${
                                                            voteScore.score > 0
                                                                ? "+"
                                                                : ""
                                                        }${voteScore.score}`,
                                                    },
                                                )}
                                            </span>
                                        )}
                                    </div>

                                    {canTransition && nextStatus && (
                                        <div className="border-t pt-4">
                                            <Button
                                                variant="secondary"
                                                disabled={
                                                    updateStatus.isPending
                                                }
                                                onClick={() =>
                                                    updateStatus.mutate(
                                                        {
                                                            id,
                                                            status: nextStatus.value,
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
                                                <HugeiconsIcon
                                                    icon={nextStatus.icon}
                                                />
                                                {updateStatus.isPending
                                                    ? t(
                                                          "pages.incidentDetail.updating",
                                                      )
                                                    : t(nextStatus.labelKey)}
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {incident.lat !== null && incident.lng !== null && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">
                                            {t(
                                                "pages.incidentDetail.locationTitle",
                                            )}
                                        </CardTitle>
                                        <CardDescription>
                                            {t(
                                                "pages.incidentDetail.locationDescription",
                                            )}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="relative isolate">
                                            <Map
                                                center={[
                                                    incident.lat,
                                                    incident.lng,
                                                ]}
                                                zoom={16}
                                                className="h-64 min-h-64 w-full"
                                            >
                                                <Marker
                                                    variant="incident"
                                                    position={[
                                                        incident.lat,
                                                        incident.lng,
                                                    ]}
                                                />
                                            </Map>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}
                </DataState>
            </div>
        </div>
    );
}
