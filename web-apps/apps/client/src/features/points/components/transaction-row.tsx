import { useTranslation } from "react-i18next";
import {
    ArrowDownLeft01Icon,
    ArrowUpRight01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { PointTransaction } from "@workspace/shared/lib/types";
import { localizedTransactionNote } from "../lib/transaction-note";

export function TransactionRow({
    transaction,
    currentUserId,
}: {
    transaction: PointTransaction;
    currentUserId: string;
}) {
    const { t, i18n } = useTranslation();
    const isIncoming = transaction.recipientId === currentUserId;
    const otherParty = isIncoming
        ? (transaction.senderName ??
          transaction.senderEmail ??
          transaction.senderId)
        : (transaction.recipientName ??
          transaction.recipientEmail ??
          transaction.recipientId);
    const date = new Date(transaction.createdAt).toLocaleDateString(
        i18n.language,
    );
    const note = localizedTransactionNote(transaction, t);

    return (
        <li className="bg-card flex items-center justify-between gap-3 rounded-lg border p-3">
            <div className="flex items-center gap-3">
                <span
                    className={
                        isIncoming
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-destructive"
                    }
                >
                    <HugeiconsIcon
                        icon={
                            isIncoming
                                ? ArrowDownLeft01Icon
                                : ArrowUpRight01Icon
                        }
                    />
                </span>
                <div className="flex flex-col">
                    <span className="text-sm font-medium">
                        {isIncoming
                            ? t("pages.points.received", { user: otherParty })
                            : t("pages.points.sent", { user: otherParty })}
                    </span>
                    {note && (
                        <span className="text-muted-foreground text-xs">
                            {note}
                        </span>
                    )}
                    <span className="text-muted-foreground text-xs tabular-nums">
                        {date}
                    </span>
                </div>
            </div>
            <span
                className={`text-sm font-semibold tabular-nums ${
                    isIncoming
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-destructive"
                }`}
            >
                {isIncoming ? "+" : "-"}
                {transaction.amount}
            </span>
        </li>
    );
}
