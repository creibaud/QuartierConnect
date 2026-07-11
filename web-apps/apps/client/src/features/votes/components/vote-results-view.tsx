import { useTranslation } from "react-i18next";
import { Tick01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Progress } from "@workspace/ui/components/progress";
import type { CommunityVote } from "../lib/vote.types";

export function VoteResultsView({
    vote,
    totals,
    totalParticipants,
    myChoices,
    isClosed,
}: {
    vote: CommunityVote;
    totals: Record<string, number>;
    totalParticipants: number;
    myChoices: string[];
    isClosed: boolean;
}) {
    const { t } = useTranslation();
    const max = Math.max(...Object.values(totals), 1);

    return (
        <div className="flex flex-col gap-3">
            <p className="text-muted-foreground text-xs">
                {isClosed
                    ? t("pages.votes.finalResults")
                    : t("pages.votes.liveResults")}
                {" · "}
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
                const isMyChoice = myChoices.includes(opt.id);
                return (
                    <div key={opt.id} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-sm">
                            <span
                                className={`flex flex-wrap items-center gap-x-1.5 ${
                                    isMyChoice ? "font-medium" : ""
                                }`}
                            >
                                {opt.label}
                                {isMyChoice && (
                                    <span className="text-primary inline-flex items-center gap-0.5 text-xs font-medium">
                                        <HugeiconsIcon
                                            icon={Tick01Icon}
                                            className="size-3.5"
                                        />
                                        {t("pages.votes.yourChoice")}
                                    </span>
                                )}
                            </span>
                            <span className="text-muted-foreground shrink-0 tabular-nums">
                                {t("pages.votes.voteCount", { count, pct })}
                            </span>
                        </div>
                        <Progress value={pct} className="h-2" />
                    </div>
                );
            })}
        </div>
    );
}
