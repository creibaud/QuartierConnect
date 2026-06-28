import { ThumbsUpIcon } from "@hugeicons/core-free-icons";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiGet } from "@workspace/shared/lib/api";
import { getCurrentUser } from "@workspace/shared/lib/auth";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import type { CommunityVote } from "../lib/community-vote";
import { formatDeadline } from "../lib/format";
import { selectOpenVotes } from "../lib/kpis";
import { EmptyBlock, FeedCard, Rows } from "./feed-card";

export function OpenVotesCard() {
    const { t } = useTranslation();
    const user = getCurrentUser();
    const { data: votes, isLoading } = useQuery<CommunityVote[]>({
        queryKey: ["community-votes"],
        queryFn: () => apiGet<CommunityVote[]>("/community-votes"),
    });
    const openVotes = selectOpenVotes(votes ?? []);

    return (
        <FeedCard title={t("pages.dashboard.openVotes")} to="/votes" icon={ThumbsUpIcon}>
            {isLoading ? (
                <Rows count={3} />
            ) : openVotes.length === 0 ? (
                <EmptyBlock
                    icon={ThumbsUpIcon}
                    title={t("pages.dashboard.noOpenVotes")}
                    subtitle={t("pages.dashboard.noOpenVotesHint")}
                />
            ) : (
                <ul className="space-y-2">
                    {openVotes.map((v) => {
                        const voted = !!user && (v.casts ?? []).some((c) => c.userId === user.sub);
                        const participants = v.casts?.length ?? 0;
                        return (
                            <li key={v._id} className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium">{v.title}</p>
                                    <p className="text-muted-foreground mt-0.5 text-xs">
                                        {t("pages.dashboard.voteParticipants", { count: participants })}
                                        {v.endsAt ? ` · ${t("pages.dashboard.voteEndsOn", { date: formatDeadline(v.endsAt) })}` : ""}
                                    </p>
                                </div>
                                {voted ? (
                                    <Badge
                                        variant="secondary"
                                        className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 shrink-0 dark:text-emerald-400"
                                    >
                                        {t("pages.dashboard.voted")}
                                    </Badge>
                                ) : (
                                    <Button asChild size="sm" variant="outline" className="shrink-0">
                                        <Link to="/votes">{t("pages.dashboard.respond")}</Link>
                                    </Button>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </FeedCard>
    );
}
