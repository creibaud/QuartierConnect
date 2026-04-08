import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import {
    apiGet,
    apiPost,
    ensureAuthenticated,
} from "@workspace/shared/lib/api";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { toast } from "sonner";

export const Route = createFileRoute("/votes/")({
    beforeLoad: async () => {
        const user = await ensureAuthenticated();
        if (!user)
            throw redirect({ to: "/login", search: { forbidden: false } });
    },
    component: VotesPage,
});

interface VoteOption {
    id: string;
    label: string;
}
interface CommunityVote {
    _id: string;
    title: string;
    description?: string;
    voteType: "binary" | "single_choice" | "multiple_choice" | "weighted";
    options: VoteOption[];
    status: "open" | "closed";
    endsAt: string;
    isAnonymous: boolean;
    quorum: number;
    casts: Array<{ userId: string; choices: string[] }>;
}

const VOTE_TYPE_LABELS: Record<string, string> = {
    binary: "Binaire",
    single_choice: "Choix unique",
    multiple_choice: "Choix multiple",
    weighted: "Pondéré",
};

function VotesPage() {
    const { data, isLoading, isError } = useQuery<CommunityVote[]>({
        queryKey: ["community-votes"],
        queryFn: () => apiGet<CommunityVote[]>("/community-votes"),
    });

    const votes = data ?? [];

    return (
        <div className="min-h-screen bg-zinc-50 p-6 dark:bg-zinc-950">
            <div className="mx-auto max-w-3xl space-y-6">
                <header className="flex items-center justify-between">
                    <div className="space-y-1">
                        <h1 className="text-xl font-semibold">
                            Votes communautaires
                        </h1>
                        <Link
                            to="/dashboard"
                            className="text-muted-foreground text-sm hover:underline"
                        >
                            ← Tableau de bord
                        </Link>
                    </div>
                </header>

                {isLoading ? (
                    <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton
                                key={i}
                                className="h-32 w-full rounded-lg"
                            />
                        ))}
                    </div>
                ) : isError ? (
                    <p className="text-destructive text-sm">
                        Erreur de chargement.
                    </p>
                ) : votes.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                        Aucun vote en cours.
                    </p>
                ) : (
                    <div className="space-y-4">
                        {votes.map((vote) => (
                            <VoteCard key={vote._id} vote={vote} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function VoteCard({ vote }: { vote: CommunityVote }) {
    const queryClient = useQueryClient();
    const [selectedChoices, setSelectedChoices] = useState<string[]>([]);
    const [weights, setWeights] = useState<Record<string, number>>({});
    const isExpired = new Date() > new Date(vote.endsAt);
    const isClosed = vote.status === "closed" || isExpired;

    const { data: results } = useQuery({
        queryKey: ["community-votes", vote._id, "results"],
        queryFn: () =>
            apiGet<Record<string, unknown>>(
                `/community-votes/${vote._id}/results`,
            ),
        enabled: isClosed,
    });

    const cast = useMutation({
        mutationFn: (payload: {
            choices: string[];
            weights?: Record<string, number>;
        }) => apiPost(`/community-votes/${vote._id}/cast`, payload),
        onSuccess: () => {
            toast.success("Vote enregistré");
            void queryClient.invalidateQueries({
                queryKey: ["community-votes"],
            });
        },
        onError: (err: Error) => toast.error(err.message ?? "Erreur"),
    });

    function toggleChoice(id: string) {
        if (vote.voteType === "binary" || vote.voteType === "single_choice") {
            setSelectedChoices([id]);
        } else {
            setSelectedChoices((prev) =>
                prev.includes(id)
                    ? prev.filter((c) => c !== id)
                    : [...prev, id],
            );
        }
    }

    function handleVote() {
        if (selectedChoices.length === 0) return;
        cast.mutate({
            choices: selectedChoices,
            ...(vote.voteType === "weighted" ? { weights } : {}),
        });
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-base">{vote.title}</CardTitle>
                    <div className="flex flex-shrink-0 gap-2">
                        <Badge variant={isClosed ? "secondary" : "default"}>
                            {isClosed ? "Terminé" : "En cours"}
                        </Badge>
                        <Badge variant="outline">
                            {VOTE_TYPE_LABELS[vote.voteType]}
                        </Badge>
                    </div>
                </div>
                {vote.description && (
                    <p className="text-muted-foreground text-sm">
                        {vote.description}
                    </p>
                )}
                <p className="text-muted-foreground text-xs">
                    Fin :{" "}
                    {new Date(vote.endsAt).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                    })}
                </p>
            </CardHeader>

            <CardContent className="space-y-3">
                {isClosed && results ? (
                    <ResultsView vote={vote} results={results} />
                ) : (
                    <>
                        <div className="space-y-2">
                            {vote.options.map((opt) => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => toggleChoice(opt.id)}
                                    className={`w-full rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                                        selectedChoices.includes(opt.id)
                                            ? "border-primary bg-primary/5 font-medium"
                                            : "border-border hover:border-primary/50"
                                    }`}
                                >
                                    {opt.label}
                                    {vote.voteType === "weighted" &&
                                        selectedChoices.includes(opt.id) && (
                                            <input
                                                type="number"
                                                min={1}
                                                max={10}
                                                className="ml-2 w-16 rounded border px-1 text-xs"
                                                value={weights[opt.id] ?? 1}
                                                onChange={(e) =>
                                                    setWeights((prev) => ({
                                                        ...prev,
                                                        [opt.id]: Number(
                                                            e.target.value,
                                                        ),
                                                    }))
                                                }
                                                onClick={(e) =>
                                                    e.stopPropagation()
                                                }
                                            />
                                        )}
                                </button>
                            ))}
                        </div>
                        <Button
                            size="sm"
                            disabled={
                                selectedChoices.length === 0 || cast.isPending
                            }
                            onClick={handleVote}
                        >
                            {cast.isPending ? "Enregistrement…" : "Voter"}
                        </Button>
                    </>
                )}
            </CardContent>
        </Card>
    );
}

function ResultsView({
    vote,
    results,
}: {
    vote: CommunityVote;
    results: Record<string, unknown>;
}) {
    const totals = (results.totals as Record<string, number>) ?? {};
    const totalParticipants = (results.totalParticipants as number) ?? 0;
    const max = Math.max(...Object.values(totals), 1);

    return (
        <div className="space-y-2">
            <p className="text-muted-foreground text-xs">
                {totalParticipants} participant(s)
            </p>
            {vote.options.map((opt) => {
                const count = totals[opt.id] ?? 0;
                const pct =
                    totalParticipants > 0
                        ? Math.round(
                              (count /
                                  (vote.voteType === "weighted"
                                      ? max
                                      : totalParticipants)) *
                                  100,
                          )
                        : 0;
                return (
                    <div key={opt.id} className="space-y-1">
                        <div className="flex justify-between text-sm">
                            <span>{opt.label}</span>
                            <span className="text-muted-foreground">
                                {count} ({pct}%)
                            </span>
                        </div>
                        <div className="bg-muted h-2 overflow-hidden rounded-full">
                            <div
                                className="bg-primary h-full rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
