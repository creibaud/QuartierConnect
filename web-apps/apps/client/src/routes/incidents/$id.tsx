import {
    createFileRoute,
    Link,
    redirect,
    useNavigate,
} from "@tanstack/react-router";
import { ensureAuthenticated } from "@workspace/shared/lib/api";
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

export const Route = createFileRoute("/incidents/$id")({
    beforeLoad: async () => {
        const user = await ensureAuthenticated();
        if (!user) throw redirect({ to: "/login" });
    },
    component: IncidentDetailPage,
});

function IncidentDetailPage() {
    const { id } = Route.useParams();
    const navigate = useNavigate();
    const user = getCurrentUser();

    const { data: incident, isLoading, isError } = useIncident(id);
    const { data: voteScore } = useVoteScore(id, "incident");
    const castVote = useCastVote();
    const updateStatus = useUpdateIncidentStatus();

    const canTransition = user?.role === "moderator" || user?.role === "admin";

    return (
        <div className="min-h-screen bg-zinc-50 p-6 dark:bg-zinc-950">
            <div className="mx-auto max-w-2xl space-y-6">
                <header className="flex items-center gap-4">
                    <Link
                        to="/incidents"
                        className="text-muted-foreground text-sm hover:underline"
                    >
                        ← Incidents
                    </Link>
                </header>

                {isLoading ? (
                    <Card>
                        <CardHeader>
                            <Skeleton className="h-6 w-3/4" />
                            <Skeleton className="mt-2 h-4 w-1/4" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-20 w-full" />
                        </CardContent>
                    </Card>
                ) : isError || !incident ? (
                    <div className="space-y-4">
                        <p className="text-destructive text-sm">
                            Incident introuvable ou erreur de chargement.
                        </p>
                        <Button
                            variant="outline"
                            onClick={() => navigate({ to: "/incidents" })}
                        >
                            Retour aux incidents
                        </Button>
                    </div>
                ) : (
                    <Card>
                        <CardHeader>
                            <div className="flex items-start justify-between gap-4">
                                <CardTitle>{incident.title}</CardTitle>
                                <Badge
                                    variant={
                                        STATUS_VARIANTS[incident.status] ??
                                        "outline"
                                    }
                                >
                                    {STATUS_LABELS[incident.status] ??
                                        incident.status}
                                </Badge>
                            </div>
                            <CardDescription>
                                Signalé le{" "}
                                {new Date(
                                    incident.createdAt,
                                ).toLocaleDateString("fr-FR")}
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

                            <div className="flex items-center gap-3 border-t pt-2">
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
                                    ▲ {voteScore?.breakdown?.up ?? 0}
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
                                    ▼ {voteScore?.breakdown?.down ?? 0}
                                </Button>
                                {voteScore !== undefined && (
                                    <span className="text-muted-foreground text-sm">
                                        Score : {voteScore.score > 0 ? "+" : ""}
                                        {voteScore.score}
                                    </span>
                                )}
                            </div>

                            {canTransition && NEXT_STATUS[incident.status] && (
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
                                        : NEXT_STATUS[incident.status]!.label}
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
