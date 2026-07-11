import { useTranslation } from "react-i18next";
import { Coins01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { getCurrentUser } from "@workspace/shared/lib/auth";
import { usePointsHistory } from "@workspace/shared/lib/hooks/points.hooks";
import { DataState } from "@workspace/ui/components/data-state";
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@workspace/ui/components/empty";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { TransactionRow } from "./transaction-row";

export function TransactionHistory() {
    const { t } = useTranslation();
    const currentUser = getCurrentUser();
    const { data: history, isLoading, isError, refetch } = usePointsHistory();
    const transactions = history ?? [];

    return (
        <div className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">
                {t("pages.points.historyTitle")}
            </h2>
            <DataState
                loading={isLoading}
                error={isError ? true : undefined}
                isEmpty={transactions.length === 0}
                onRetry={() => void refetch()}
                errorTitle={t("pages.points.loadError")}
                skeleton={
                    <div className="flex flex-col gap-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton
                                key={i}
                                className="h-16 w-full rounded-lg"
                            />
                        ))}
                    </div>
                }
                empty={
                    <Empty className="border">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <HugeiconsIcon icon={Coins01Icon} />
                            </EmptyMedia>
                            <EmptyTitle>
                                {t("pages.points.emptyTitle")}
                            </EmptyTitle>
                            <EmptyDescription>
                                {t("pages.points.emptyDescription")}
                            </EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                }
            >
                <ul className="flex flex-col gap-2">
                    {transactions.map((transaction) => (
                        <TransactionRow
                            key={transaction.id}
                            transaction={transaction}
                            currentUserId={currentUser?.sub ?? ""}
                        />
                    ))}
                </ul>
            </DataState>
        </div>
    );
}
