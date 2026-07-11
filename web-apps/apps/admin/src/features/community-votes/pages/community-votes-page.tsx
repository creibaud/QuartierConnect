import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Add01Icon, Agreement01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQueryClient } from "@tanstack/react-query";
import { useAdminCommunityVotes } from "@workspace/shared/lib/hooks/admin-lists.hooks";
import { Button } from "@workspace/ui/components/button";
import { DataState } from "@workspace/ui/components/data-state";
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@workspace/ui/components/empty";
import { PageHeader } from "@workspace/ui/components/page-header";
import { DataPagination } from "@workspace/ui/components/pagination";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { toast } from "sonner";
import { CommunityVoteCard } from "../components/community-vote-card";
import { CreateVoteDialog } from "../components/create-vote-dialog";
import { VoteResultsDialog } from "../components/vote-results-dialog";
import { useCloseVote } from "../hooks/community-votes.hooks";
import type { CommunityVote } from "../lib/community-vote.types";

const PAGE_SIZE = 12;

export function CommunityVotesPage() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [createOpen, setCreateOpen] = useState(false);
    const [resultsVote, setResultsVote] = useState<CommunityVote | null>(null);
    const [page, setPage] = useState(1);

    const { rows, totalPages, isLoading, error } = useAdminCommunityVotes({
        page,
        limit: PAGE_SIZE,
    });
    const votes = rows as CommunityVote[];
    const closeVote = useCloseVote();

    function refreshList() {
        void queryClient.invalidateQueries({
            queryKey: ["admin-community-votes"],
        });
    }

    function handleCloseVote(id: string) {
        closeVote.mutate(id, {
            onSuccess: () => toast.success(t("adminPages.communityVotes.closed")),
            onError: () => toast.error(t("common.error")),
        });
    }

    return (
        <div className="p-6 md:p-8">
            <div className="mx-auto flex max-w-7xl flex-col gap-6">
                <PageHeader
                    title={t("adminPages.communityVotes.title")}
                    description={t("adminPages.communityVotes.description")}
                    actions={
                        <Button onClick={() => setCreateOpen(true)}>
                            <HugeiconsIcon icon={Add01Icon} />
                            {t("adminPages.common.create")}
                        </Button>
                    }
                />

                <DataState
                    loading={isLoading}
                    error={error ? true : undefined}
                    isEmpty={votes.length === 0}
                    errorTitle={t("adminPages.communityVotes.loadError")}
                    skeleton={
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <Skeleton
                                    key={i}
                                    className="h-40 w-full rounded-lg"
                                />
                            ))}
                        </div>
                    }
                    empty={
                        <Empty>
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <HugeiconsIcon icon={Agreement01Icon} />
                                </EmptyMedia>
                                <EmptyTitle>
                                    {t("adminPages.communityVotes.emptyTitle")}
                                </EmptyTitle>
                                <EmptyDescription>
                                    {t(
                                        "adminPages.communityVotes.emptyDescription",
                                    )}
                                </EmptyDescription>
                            </EmptyHeader>
                            <EmptyContent>
                                <Button onClick={() => setCreateOpen(true)}>
                                    <HugeiconsIcon icon={Add01Icon} />
                                    {t("adminPages.common.create")}
                                </Button>
                            </EmptyContent>
                        </Empty>
                    }
                >
                    <div className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {votes.map((vote) => (
                                <CommunityVoteCard
                                    key={vote._id}
                                    vote={vote}
                                    closePending={closeVote.isPending}
                                    onViewResults={setResultsVote}
                                    onCloseVote={handleCloseVote}
                                />
                            ))}
                        </div>
                        <DataPagination
                            page={page}
                            pageCount={totalPages}
                            onPageChange={setPage}
                            previousLabel={t("adminPages.common.previousPage")}
                            nextLabel={t("adminPages.common.nextPage")}
                        />
                    </div>
                </DataState>

                <CreateVoteDialog
                    open={createOpen}
                    onOpenChange={setCreateOpen}
                    onSuccess={() => {
                        setCreateOpen(false);
                        refreshList();
                    }}
                />

                {resultsVote && (
                    <VoteResultsDialog
                        vote={resultsVote}
                        onOpenChange={(open) => {
                            if (!open) setResultsVote(null);
                        }}
                    />
                )}
            </div>
        </div>
    );
}
