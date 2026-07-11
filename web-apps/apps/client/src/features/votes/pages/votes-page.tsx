import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChartColumnIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { getCurrentUser } from "@workspace/shared/lib/auth";
import { DataState } from "@workspace/ui/components/data-state";
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@workspace/ui/components/empty";
import { PageHeader } from "@workspace/ui/components/page-header";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@workspace/ui/components/select";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@workspace/ui/components/tabs";
import { VoteCard } from "../components/vote-card";
import { useCommunityVotes } from "../hooks/votes.hooks";
import {
    compareByEndsAt,
    hasVotedOn,
    isVoteClosed,
    type VoteSort,
} from "../lib/vote-filters";

export function VotesPage() {
    const { t } = useTranslation();
    const user = getCurrentUser();
    const [tab, setTab] = useState<"open" | "voted" | "closed">("open");
    const [sort, setSort] = useState<VoteSort>("deadline");
    const { data, isLoading, isError, refetch } = useCommunityVotes();

    const votes = data ?? [];
    const [now] = useState(() => Date.now());
    const sortFn = (a: (typeof votes)[number], b: (typeof votes)[number]) =>
        compareByEndsAt(a, b, sort);
    const openVotes = votes.filter((v) => !isVoteClosed(v, now)).sort(sortFn);
    const votedVotes = votes.filter((v) => hasVotedOn(v, user?.sub)).sort(sortFn);
    const closedVotes = votes.filter((v) => isVoteClosed(v, now)).sort(sortFn);
    const shown =
        tab === "open" ? openVotes : tab === "voted" ? votedVotes : closedVotes;
    const emptyMsg =
        tab === "open"
            ? t("pages.votes.emptyTitle")
            : tab === "voted"
              ? t("pages.votes.noAnswered")
              : t("pages.votes.noHistory");

    return (
        <div className="p-6 md:p-8">
            <div className="mx-auto flex max-w-7xl flex-col gap-6">
                <PageHeader
                    title={t("pages.votes.title")}
                    description={t("pages.votes.description")}
                    actions={
                        <Select
                            value={sort}
                            onValueChange={(v) => setSort(v as VoteSort)}
                        >
                            <SelectTrigger className="w-44">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="deadline">
                                    {t("pages.votes.sortDeadline")}
                                </SelectItem>
                                <SelectItem value="recent">
                                    {t("pages.votes.sortRecent")}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    }
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
                    <Tabs
                        value={tab}
                        onValueChange={(v) =>
                            setTab(v as "open" | "voted" | "closed")
                        }
                    >
                        <TabsList>
                            <TabsTrigger value="open">
                                {t("pages.votes.open")} ({openVotes.length})
                            </TabsTrigger>
                            <TabsTrigger value="voted">
                                {t("pages.votes.answered")} ({votedVotes.length})
                            </TabsTrigger>
                            <TabsTrigger value="closed">
                                {t("pages.votes.closed")} ({closedVotes.length})
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent
                            value={tab}
                            className="mt-4 flex flex-col gap-4"
                        >
                            {shown.length === 0 ? (
                                <p className="text-muted-foreground text-sm">
                                    {emptyMsg}
                                </p>
                            ) : (
                                shown.map((vote) => (
                                    <VoteCard key={vote._id} vote={vote} />
                                ))
                            )}
                        </TabsContent>
                    </Tabs>
                </DataState>
            </div>
        </div>
    );
}
