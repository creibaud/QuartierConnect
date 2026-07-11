import { useTranslation } from "react-i18next";
import { DataState } from "@workspace/ui/components/data-state";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@workspace/ui/components/dialog";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { StatusBadge } from "@workspace/ui/components/status-badge";
import { useVoteResults } from "../hooks/community-votes.hooks";
import type { CommunityVote } from "../lib/community-vote.types";

export function VoteResultsDialog({
    vote,
    onOpenChange,
}: {
    vote: CommunityVote;
    onOpenChange: (open: boolean) => void;
}) {
    const { t } = useTranslation();
    const { data, isLoading, isError, refetch } = useVoteResults(vote._id);

    return (
        <Dialog open onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        {t("adminPages.communityVotes.resultsTitle")}
                    </DialogTitle>
                    <DialogDescription>{vote.title}</DialogDescription>
                </DialogHeader>
                <DataState
                    loading={isLoading}
                    error={isError ? true : undefined}
                    isEmpty={!data || data.totalVotes === 0}
                    onRetry={() => void refetch()}
                    errorTitle={t("adminPages.communityVotes.resultsLoadError")}
                    skeleton={
                        <div className="flex flex-col gap-3">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <Skeleton
                                    key={i}
                                    className="h-10 w-full rounded"
                                />
                            ))}
                        </div>
                    }
                    empty={
                        <p className="text-muted-foreground py-6 text-center text-sm">
                            {t("adminPages.communityVotes.noResults")}
                        </p>
                    }
                >
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-muted-foreground text-sm">
                                {t("adminPages.communityVotes.totalVotes", {
                                    count: data?.totalVotes ?? 0,
                                })}
                            </p>
                            <StatusBadge
                                tone={data?.quorumReached ? "success" : "neutral"}
                            >
                                {data?.quorumReached
                                    ? t("adminPages.communityVotes.quorumReached")
                                    : t(
                                          "adminPages.communityVotes.quorumNotReached",
                                      )}
                            </StatusBadge>
                        </div>
                        <ul className="space-y-3">
                            {(data?.results ?? []).map((option) => (
                                <li key={option.optionId} className="space-y-1">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-medium">
                                            {option.label}
                                        </span>
                                        <span className="text-muted-foreground tabular-nums">
                                            {option.count} ·{" "}
                                            {option.percentage.toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                                        <div
                                            className="bg-primary h-full rounded-full"
                                            style={{
                                                width: `${option.percentage}%`,
                                            }}
                                        />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </DataState>
            </DialogContent>
        </Dialog>
    );
}
