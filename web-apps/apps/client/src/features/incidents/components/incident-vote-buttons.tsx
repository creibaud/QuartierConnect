import { useTranslation } from "react-i18next";
import { ArrowDown01Icon, ArrowUp01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCastVote, useVoteScore } from "@workspace/shared/lib/hooks/useVotes";
import { Button } from "@workspace/ui/components/button";
import { toast } from "sonner";

export function IncidentVoteButtons({ id }: { id: string }) {
    const { t } = useTranslation();
    const { data: voteScore } = useVoteScore(id, "incident");
    const castVote = useCastVote();

    const onVoteError = () => toast.error(t("votes.voteError"));

    return (
        <div className="flex items-center gap-3 border-t pt-4">
            <Button
                variant="outline"
                size="sm"
                disabled={castVote.isPending}
                onClick={() =>
                    castVote.mutate(
                        {
                            targetId: id,
                            targetType: "incident",
                            voteType: "up",
                        },
                        { onError: onVoteError },
                    )
                }
            >
                <HugeiconsIcon icon={ArrowUp01Icon} />
                {voteScore?.breakdown?.up ?? 0}
            </Button>
            <Button
                variant="outline"
                size="sm"
                disabled={castVote.isPending}
                onClick={() =>
                    castVote.mutate(
                        {
                            targetId: id,
                            targetType: "incident",
                            voteType: "down",
                        },
                        { onError: onVoteError },
                    )
                }
            >
                <HugeiconsIcon icon={ArrowDown01Icon} />
                {voteScore?.breakdown?.down ?? 0}
            </Button>
            {voteScore !== undefined && (
                <span className="text-muted-foreground text-sm tabular-nums">
                    {t("pages.incidentDetail.score", {
                        score: `${
                            voteScore.score > 0 ? "+" : ""
                        }${voteScore.score}`,
                    })}
                </span>
            )}
        </div>
    );
}
