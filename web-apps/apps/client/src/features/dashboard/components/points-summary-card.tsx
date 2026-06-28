import { Coins01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslation } from "react-i18next";
import { usePointBalance, usePointsHistory } from "@workspace/shared/lib/hooks/points.hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { resolveCounterparty, formatPointsDelta } from "../lib/format";
import { EmptyBlock, Rows } from "./feed-card";

export function PointsSummaryCard({ currentEmail }: { currentEmail: string }) {
    const { t } = useTranslation();
    const { data: balance } = usePointBalance();
    const { data: history, isLoading } = usePointsHistory(1, 5);
    const transactions = (history ?? []).slice(0, 4);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <HugeiconsIcon icon={Coins01Icon} className="text-primary size-5" />
                    {t("pages.dashboard.yourPoints")}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid gap-6 sm:grid-cols-2">
                    <div className="flex flex-col justify-center">
                        <p className="font-heading text-5xl font-semibold tabular-nums">
                            {balance?.balance ?? "—"}
                        </p>
                        <p className="text-muted-foreground mt-1 text-sm">
                            {t("pages.dashboard.participationPoints")}
                        </p>
                    </div>
                    <div>
                        <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
                            {t("pages.dashboard.recentTransactions")}
                        </p>
                        {isLoading ? (
                            <Rows count={3} />
                        ) : transactions.length === 0 ? (
                            <EmptyBlock
                                icon={Coins01Icon}
                                title={t("pages.dashboard.noTransactions")}
                                subtitle={t("pages.dashboard.noTransactionsHint")}
                            />
                        ) : (
                            <ul className="space-y-1.5">
                                {transactions.map((tx) => {
                                    const { received, name } = resolveCounterparty(tx, currentEmail);
                                    return (
                                        <li
                                            key={tx.id}
                                            className="flex items-center justify-between gap-2 text-sm"
                                        >
                                            <span className="text-muted-foreground truncate">{name}</span>
                                            <span className="font-medium tabular-nums">
                                                {formatPointsDelta(received, tx.amount)}
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
