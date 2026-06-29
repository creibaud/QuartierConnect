import { ThumbsUpIcon } from "@hugeicons/core-free-icons";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiGet } from "@workspace/shared/lib/api";
import { getCurrentUser } from "@workspace/shared/lib/auth";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Item, ItemGroup, ItemContent, ItemTitle, ItemDescription, ItemActions } from "@workspace/ui/components/item";
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
                <ItemGroup>
                    {openVotes.map((v) => {
                        const voted = !!user && (v.casts ?? []).some((c) => c.userId === user.sub);
                        const participants = v.casts?.length ?? 0;
                        return (
                            <Item key={v._id} variant="outline" size="sm">
                                <ItemContent>
                                    <ItemTitle>{v.title}</ItemTitle>
                                    <ItemDescription>
                                        {t("pages.dashboard.voteParticipants", { count: participants })}
                                        {v.endsAt ? ` · ${t("pages.dashboard.voteEndsOn", { date: formatDeadline(v.endsAt) })}` : ""}
                                    </ItemDescription>
                                </ItemContent>
                                <ItemActions>
                                    {voted ? (
                                        <Badge variant="secondary" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                                            {t("pages.dashboard.voted")}
                                        </Badge>
                                    ) : (
                                        <Button asChild size="sm" variant="outline">
                                            <Link to="/votes">{t("pages.dashboard.respond")}</Link>
                                        </Button>
                                    )}
                                </ItemActions>
                            </Item>
                        );
                    })}
                </ItemGroup>
            )}
        </FeedCard>
    );
}
