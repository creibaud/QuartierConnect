import { ArrowDown01Icon, ArrowUp01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
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
import { PageHeader } from "@workspace/ui/components/page-header";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, string> = {
    open: "Ouvert",
    in_progress: "En cours",
    resolved: "Résolu",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
    open: "default",
    in_progress: "secondary",
    resolved: "outline",
};

const NEXT_STATUS: Record<
    string,
    { value: "open" | "in_progress" | "resolved"; label: string } | null
> = {
    open: { value: "in_progress", label: "Passer en cours" },
    in_progress: { value: "resolved", label: "Marquer résolu" },
    resolved: null,
};

export const Route = createFileRoute("/_app/incidents/$id")({
    component: IncidentDetailPage,
});

function IncidentDetailPage() {
    const { id } = Route.useParams();
    const user = getCurrentUser();

    const { data: incident, isLoading, isError, refetch } = useIncident(id);
    const { data: voteScore } = useVoteScore(id, "incident");
    const castVote = useCastVote();
    const updateStatus = useUpdateIncidentStatus();

    const canTransition = user?.role === "moderator" || user?.role === "admin";

    return (
        <div className="p-6 md:p-8">
            <div className="mx-auto max-w-5xl space-y-6">
                <PageHeader
                    title={incident?.title ?? "Incident"}
                    description={
                        incident
                            ? `Signalé le ${new Date(
                                  incident.createdAt,
                              ).toLocaleDateString("fr-FR")}`
                            : undefined
                    }
                    actions={
                        incident ? (
                            <Badge
                                variant={
                                    STATUS_VARIANTS[incident.status] ?? "outline"
                                }
                            >
                                {STATUS_LABELS[incident.status] ??
                                    incident.status}
                            </Badge>
                        ) : undefined
                    }
                />

                <DataState
                    loading={isLoading}
                    error={isError || (!isLoading && !incident) ? true : undefined}
                    onRetry={() => refetch()}
                    errorTitle="Incident introuvable"
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
                                    Description
                                </CardTitle>
                                <CardDescription>
                                    Détail du signalement
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {incident.description ? (
                                    <p className="text-sm">
                                        {incident.description}
                                    </p>
                                ) : (
                                    <p className="text-muted-foreground text-sm">
                                        Aucune description fournie.
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
                                                            "Impossible de voter",
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
                                                            "Impossible de voter",
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
                                            Score :{" "}
                                            {voteScore.score > 0 ? "+" : ""}
                                            {voteScore.score}
                                        </span>
                                    )}
                                </div>

                                {canTransition &&
                                    NEXT_STATUS[incident.status] && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={updateStatus.isPending}
                                            onClick={() =>
                                                updateStatus.mutate(
                                                    {
                                                        id,
                                                        status: NEXT_STATUS[
                                                            incident.status
                                                        ]!.value,
                                                    },
                                                    {
                                                        onSuccess: () =>
                                                            toast.success(
                                                                "Statut mis à jour",
                                                            ),
                                                        onError: () =>
                                                            toast.error(
                                                                "Impossible de changer le statut",
                                                            ),
                                                    },
                                                )
                                            }
                                        >
                                            {updateStatus.isPending
                                                ? "Mise à jour…"
                                                : NEXT_STATUS[incident.status]!
                                                      .label}
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
