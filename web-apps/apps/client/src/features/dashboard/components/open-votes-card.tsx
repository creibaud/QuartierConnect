import { ThumbsUpIcon } from "@hugeicons/core-free-icons";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiGet } from "@workspace/shared/lib/api";
import { Button } from "@workspace/ui/components/button";
import { selectOpenVotes } from "../lib/kpis";
import { EmptyBlock, FeedCard, Rows } from "./feed-card";

interface CommunityVote {
    _id: string;
    title: string;
    status: "open" | "closed";
}

export function OpenVotesCard() {
    const { t } = useTranslation();
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
                <EmptyBlock icon={ThumbsUpIcon} text={t("pages.dashboard.noOpenVotes")} />
            ) : (
                <ul className="space-y-2">
                    {openVotes.map((v) => (
                        <li key={v._id} className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-medium">{v.title}</span>
                            <Button asChild size="sm" variant="outline" className="shrink-0">
                                <Link to="/votes">{t("pages.dashboard.respond")}</Link>
                            </Button>
                        </li>
                    ))}
                </ul>
            )}
        </FeedCard>
    );
}
