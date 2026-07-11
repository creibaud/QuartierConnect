import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Tick01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { getCurrentUser } from "@workspace/shared/lib/auth";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components/card";
import {
    StatusBadge,
    statusTone,
} from "@workspace/ui/components/status-badge";
import { toast } from "sonner";
import { useCastCommunityVote, useVoteResults } from "../hooks/votes.hooks";
import { computeVoteTotals } from "../lib/vote-totals";
import type { CommunityVote } from "../lib/vote.types";
import { ChoiceIndicator } from "./choice-indicator";
import { VoteResultsView } from "./vote-results-view";

export function VoteCard({ vote }: { vote: CommunityVote }) {
    const { t, i18n } = useTranslation();
    const user = getCurrentUser();
    const [selectedChoices, setSelectedChoices] = useState<string[]>([]);
    const [weights, setWeights] = useState<Record<string, number>>({});
    const isExpired = new Date() > new Date(vote.endsAt);
    const isClosed = vote.status === "closed" || isExpired;
    const hasVoted = user
        ? vote.casts.some((c) => c.userId === user.sub)
        : false;
    const myChoices = user
        ? (vote.casts.find((c) => c.userId === user.sub)?.choices ?? [])
        : [];
    const isMultiSelect =
        vote.voteType === "multiple_choice" || vote.voteType === "weighted";

    const showResults = hasVoted || isClosed;
    // Anonymous votes only carry your own cast; totals come from the results endpoint.
    const { data: apiResults } = useVoteResults(vote._id, showResults);

    const localResults = computeVoteTotals(vote);
    const totals =
        (apiResults?.totals as Record<string, number> | undefined) ??
        localResults.totals;
    const totalParticipants =
        (apiResults?.totalParticipants as number | undefined) ??
        localResults.totalParticipants;

    const cast = useCastCommunityVote(vote._id);

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
        cast.mutate(
            {
                choices: selectedChoices,
                ...(vote.voteType === "weighted" ? { weights } : {}),
            },
            {
                onSuccess: () => toast.success(t("pages.votes.voteRecorded")),
                // Only the 409 (already voted) maps to a specific message; the rest are generic.
                onError: (err) =>
                    toast.error(
                        (err as { status?: number }).status === 409
                            ? t("pages.votes.alreadyVoted")
                            : t("pages.votes.castError"),
                    ),
            },
        );
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                    <CardTitle className="text-base">{vote.title}</CardTitle>
                    <div className="flex flex-wrap gap-2 sm:shrink-0 sm:justify-end">
                        {hasVoted && (
                            <Badge variant="outline">
                                <HugeiconsIcon icon={Tick01Icon} />
                                {t("pages.votes.youVoted")}
                            </Badge>
                        )}
                        <StatusBadge
                            tone={statusTone(isClosed ? "closed" : "open")}
                        >
                            {isClosed
                                ? t("pages.votes.closed")
                                : t("pages.votes.open")}
                        </StatusBadge>
                    </div>
                </div>
                {vote.description && (
                    <p className="text-muted-foreground text-sm">
                        {vote.description}
                    </p>
                )}
                <p className="text-muted-foreground text-xs">
                    {t("pages.votes.endsOn", {
                        date: new Date(vote.endsAt).toLocaleDateString(i18n.language, {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                        }),
                    })}
                </p>
            </CardHeader>

            <CardContent className="flex flex-col gap-3">
                {showResults ? (
                    <VoteResultsView
                        vote={vote}
                        totals={totals}
                        totalParticipants={totalParticipants}
                        myChoices={myChoices}
                        isClosed={isClosed}
                    />
                ) : (
                    <>
                        <div className="flex flex-col gap-2">
                            {vote.options.map((opt) => {
                                const selected = selectedChoices.includes(
                                    opt.id,
                                );
                                return (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        aria-pressed={selected}
                                        onClick={() => toggleChoice(opt.id)}
                                        className={`flex w-full cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                                            selected
                                                ? "border-primary bg-primary/5 font-medium"
                                                : "border-border hover:border-primary/50 hover:bg-muted/50"
                                        }`}
                                    >
                                        <ChoiceIndicator
                                            selected={selected}
                                            multiple={isMultiSelect}
                                        />
                                        <span className="flex-1">
                                            {opt.label}
                                        </span>
                                        {vote.voteType === "weighted" &&
                                            selected && (
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={10}
                                                    className="w-16 rounded border px-1 text-xs"
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
                                );
                            })}
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
