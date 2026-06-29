import { Coins01Icon } from "@hugeicons/core-free-icons";
import { useTranslation } from "react-i18next";
import { usePointsHistory } from "@workspace/shared/lib/hooks/points.hooks";
import {
    Item,
    ItemGroup,
    ItemContent,
    ItemTitle,
    ItemActions,
} from "@workspace/ui/components/item";
import { resolveCounterparty, formatPointsDelta } from "../lib/format";
import { EmptyBlock, FeedCard, Rows } from "./feed-card";

export function TransactionsCard({ currentEmail }: { currentEmail: string }) {
    const { t } = useTranslation();
    const { data: history, isLoading } = usePointsHistory(1, 5);
    const transactions = (history ?? []).slice(0, 4);

    return (
        <FeedCard
            title={t("pages.dashboard.recentTransactions")}
            to="/points"
            icon={Coins01Icon}
        >
            {isLoading ? (
                <Rows count={3} />
            ) : transactions.length === 0 ? (
                <EmptyBlock
                    icon={Coins01Icon}
                    title={t("pages.dashboard.noTransactions")}
                    subtitle={t("pages.dashboard.noTransactionsHint")}
                />
            ) : (
                <ItemGroup>
                    {transactions.map((tx) => {
                        const { received, name } = resolveCounterparty(tx, currentEmail);
                        return (
                            <Item key={tx.id} variant="outline" size="sm">
                                <ItemContent>
                                    <ItemTitle>{name}</ItemTitle>
                                </ItemContent>
                                <ItemActions>
                                    <span
                                        className={
                                            received
                                                ? "text-emerald-600 dark:text-emerald-400 font-medium tabular-nums"
                                                : "text-muted-foreground font-medium tabular-nums"
                                        }
                                    >
                                        {formatPointsDelta(received, tx.amount)}
                                    </span>
                                </ItemActions>
                            </Item>
                        );
                    })}
                </ItemGroup>
            )}
        </FeedCard>
    );
}
