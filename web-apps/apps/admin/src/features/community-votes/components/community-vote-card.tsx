import { useTranslation } from "react-i18next";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import {
    StatusBadge,
    statusTone,
} from "@workspace/ui/components/status-badge";
import type { CommunityVote } from "../lib/community-vote.types";
import { voteTypeLabel } from "../lib/vote-type-label";
import { CloseVoteDialog } from "./close-vote-dialog";

export function CommunityVoteCard({
    vote,
    closePending,
    onViewResults,
    onCloseVote,
}: {
    vote: CommunityVote;
    closePending: boolean;
    onViewResults: (vote: CommunityVote) => void;
    onCloseVote: (id: string) => void;
}) {
    const { t, i18n } = useTranslation();

    return (
        <Card className="flex flex-col">
            <CardHeader className="gap-2">
                <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{vote.title}</CardTitle>
                    <StatusBadge tone={statusTone(vote.status)}>
                        {vote.status === "open"
                            ? t("adminPages.communityVotes.statusOpen")
                            : t("adminPages.communityVotes.statusClosed")}
                    </StatusBadge>
                </div>
                <p className="text-muted-foreground text-xs">
                    {voteTypeLabel(t, vote.voteType)}
                </p>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-end gap-4">
                <dl className="grid grid-cols-2 gap-3 text-sm">
                    <div className="space-y-0.5">
                        <dt className="text-muted-foreground text-xs">
                            {t("adminPages.communityVotes.participants")}
                        </dt>
                        <dd className="font-medium tabular-nums">
                            {vote.participantCount ?? vote.casts.length}
                        </dd>
                    </div>
                    <div className="space-y-0.5">
                        <dt className="text-muted-foreground text-xs">
                            {t("adminPages.communityVotes.endsAt")}
                        </dt>
                        <dd className="font-medium tabular-nums">
                            {new Date(vote.endsAt).toLocaleDateString(
                                i18n.language,
                            )}
                        </dd>
                    </div>
                </dl>
                <div className="flex flex-col gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => onViewResults(vote)}
                    >
                        {t("adminPages.communityVotes.viewResults")}
                    </Button>
                    {vote.status === "open" && (
                        <CloseVoteDialog
                            disabled={closePending}
                            onConfirm={() => onCloseVote(vote._id)}
                        />
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
