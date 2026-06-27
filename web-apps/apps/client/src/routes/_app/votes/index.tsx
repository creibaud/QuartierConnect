import { useState } from "react";
import { ChartColumnIcon, Tick01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
    apiGet,
    apiPost,
} from "@workspace/shared/lib/api";
import { getCurrentUser } from "@workspace/shared/lib/auth";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
    Card,
    CardContent,
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
import { Progress } from "@workspace/ui/components/progress";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/votes/")({
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

function VotesPage() {
    const { t } = useTranslation();
    const { data, isLoading, isError, refetch } = useQuery<CommunityVote[]>({
        queryKey: ["community-votes"],
        queryFn: () => apiGet<CommunityVote[]>("/community-votes"),
    });

    const votes = data ?? [];

    return (
        <div className="p-6 md:p-8">
            <div className="mx-auto flex max-w-5xl flex-col gap-6">
                <PageHeader
                    title={t("pages.votes.title")}
                    description={t("pages.votes.description")}
                />

                <DataState
                    loading={isLoading}
                    error={isError ? true : undefined}
                    isEmpty={votes.length === 0}
                    onRetry={() => void refetch()}
                    skeleton={
                        <div className="flex flex-col gap-4">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <Skeleton
                                    key={i}
                                    className="h-40 w-full rounded-xl"
                                />
                            ))}
                        </div>
                    }
                    empty={
                        <Empty className="border">
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <HugeiconsIcon icon={ChartColumnIcon} />
                                </EmptyMedia>
                                <EmptyTitle>
                                    {t("pages.votes.emptyTitle")}
                                </EmptyTitle>
                                <EmptyDescription>
                                    {t("pages.votes.emptyDescription")}
                                </EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    }
                >
                    <div className="flex flex-col gap-4">
                        {votes.map((vote) => (
                            <VoteCard key={vote._id} vote={vote} />
                        ))}
                    </div>
                </DataState>
            </div>
        </div>
    );
}

function VoteCard({ vote }: { vote: CommunityVote }) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const user = getCurrentUser();
    const voteTypeLabels: Record<string, string> = {
        binary: t("pages.votes.types.binary"),
        single_choice: t("pages.votes.types.singleChoice"),
        multiple_choice: t("pages.votes.types.multipleChoice"),
        weighted: t("pages.votes.types.weighted"),
    };
    const [selectedChoices, setSelectedChoices] = useState<string[]>([]);
    const [weights, setWeights] = useState<Record<string, number>>({});
    const isExpired = new Date() > new Date(vote.endsAt);
    const isClosed = vote.status === "closed" || isExpired;
    const hasVoted = user
        ? vote.casts.some((c) => c.userId === user.sub)
        : false;

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
            toast.success(t("pages.votes.voteRecorded"));
            void queryClient.invalidateQueries({
                queryKey: ["community-votes"],
            });
        },
        onError: (err: Error) => toast.error(err.message ?? t("common.error")),
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
                    <div className="flex flex-shrink-0 flex-wrap justify-end gap-2">
                        {hasVoted && (
                            <Badge variant="outline">
                                <HugeiconsIcon icon={Tick01Icon} />
                                {t("pages.votes.youVoted")}
                            </Badge>
                        )}
                        <Badge variant={isClosed ? "secondary" : "default"}>
                            {isClosed
                                ? t("pages.votes.closed")
                                : t("pages.votes.open")}
                        </Badge>
                        <Badge variant="outline">
                            {voteTypeLabels[vote.voteType]}
                        </Badge>
                    </div>
                </div>
                {vote.description && (
                    <p className="text-muted-foreground text-sm">
                        {vote.description}
                    </p>
                )}
                <p className="text-muted-foreground text-xs">
                    {t("pages.votes.endsOn", {
                        date: new Date(vote.endsAt).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                        }),
                    })}
                </p>
            </CardHeader>

            <CardContent className="flex flex-col gap-3">
                {isClosed && results ? (
                    <ResultsView vote={vote} results={results} />
                ) : (
                    <>
                        <div className="flex flex-col gap-2">
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
                            className="w-fit"
                            disabled={
                                selectedChoices.length === 0 || cast.isPending
                            }
                            onClick={handleVote}
                        >
                            {cast.isPending
                                ? t("pages.votes.recording")
                                : t("pages.votes.vote")}
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
    const { t } = useTranslation();
    const totals = (results.totals as Record<string, number>) ?? {};
    const totalParticipants = (results.totalParticipants as number) ?? 0;
    const max = Math.max(...Object.values(totals), 1);

    return (
        <div className="flex flex-col gap-3">
            <p className="text-muted-foreground text-xs">
                {t("pages.votes.participantCount", {
                    count: totalParticipants,
                })}
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
                    <div key={opt.id} className="space-y-1.5">
                        <div className="flex justify-between text-sm">
                            <span>{opt.label}</span>
                            <span className="text-muted-foreground tabular-nums">
                                {count} ({pct}%)
                            </span>
                        </div>
                        <Progress value={pct} className="h-2" />
                    </div>
                );
            })}
        </div>
    );
}
