import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
    ArrowDownLeft01Icon,
    ArrowUpRight01Icon,
    Coins01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute } from "@tanstack/react-router";
import { getCurrentUser } from "@workspace/shared/lib/auth";
import {
    usePointBalance,
    usePointsHistory,
    useTransferPoints,
} from "@workspace/shared/lib/hooks/points.hooks";
import type { PointTransaction } from "@workspace/shared/lib/types";
import { Button } from "@workspace/ui/components/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components/card";
import { DataState } from "@workspace/ui/components/data-state";
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@workspace/ui/components/empty";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { PageHeader } from "@workspace/ui/components/page-header";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Textarea } from "@workspace/ui/components/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/points/")({
    component: PointsPage,
});

function PointsPage() {
    const { t } = useTranslation();
    const currentUser = getCurrentUser();
    const { data: balance } = usePointBalance();
    const { data: history, isLoading, isError, refetch } = usePointsHistory();
    const transactions = history ?? [];

    return (
        <div className="p-6 md:p-8">
            <div className="mx-auto flex max-w-3xl flex-col gap-6">
                <PageHeader
                    title={t("pages.points.title")}
                    description={t("pages.points.description")}
                />

                <Card>
                    <CardHeader>
                        <CardDescription>
                            {t("pages.points.balanceTitle")}
                        </CardDescription>
                        <CardTitle className="flex items-center gap-2 text-3xl tabular-nums">
                            <HugeiconsIcon icon={Coins01Icon} />
                            {balance?.balance ?? 0}
                            <span className="text-muted-foreground text-base font-normal">
                                {t("pages.points.balanceUnit")}
                            </span>
                        </CardTitle>
                    </CardHeader>
                </Card>

                <TransferForm />

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
            </div>
        </div>
    );
}

function TransactionRow({
    transaction,
    currentUserId,
}: {
    transaction: PointTransaction;
    currentUserId: string;
}) {
    const { t } = useTranslation();
    const isIncoming = transaction.recipientId === currentUserId;
    const otherParty = isIncoming
        ? transaction.senderId
        : transaction.recipientId;
    const date = new Date(transaction.createdAt).toLocaleDateString("fr-FR");

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
                    {transaction.note && (
                        <span className="text-muted-foreground text-xs">
                            {transaction.note}
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

function TransferForm() {
    const { t } = useTranslation();
    const [recipientId, setRecipientId] = useState("");
    const [amount, setAmount] = useState("");
    const [note, setNote] = useState("");
    const transferPoints = useTransferPoints();

    const parsedAmount = Number(amount);
    const isValid =
        recipientId.trim() !== "" &&
        Number.isInteger(parsedAmount) &&
        parsedAmount >= 1;

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!isValid) return;
        transferPoints.mutate(
            {
                recipientId: recipientId.trim(),
                amount: parsedAmount,
                note: note.trim() || undefined,
            },
            {
                onSuccess: () => {
                    toast.success(t("pages.points.transferSuccess"));
                    setRecipientId("");
                    setAmount("");
                    setNote("");
                },
                onError: (error: Error) =>
                    toast.error(
                        error.message || t("pages.points.transferError"),
                    ),
            },
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">
                    {t("pages.points.transferTitle")}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="points-recipient">
                            {t("pages.points.recipientLabel")}
                        </Label>
                        <Input
                            id="points-recipient"
                            value={recipientId}
                            onChange={(e) => setRecipientId(e.target.value)}
                            placeholder={t("pages.points.recipientPlaceholder")}
                            autoComplete="off"
                            required
                        />
                        <p className="text-muted-foreground text-xs">
                            {t("pages.points.recipientHint")}
                        </p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="points-amount">
                            {t("pages.points.amountLabel")}
                        </Label>
                        <Input
                            id="points-amount"
                            type="number"
                            min={1}
                            step={1}
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="points-note">
                            {t("pages.points.noteLabel")}
                        </Label>
                        <Textarea
                            id="points-note"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder={t("pages.points.notePlaceholder")}
                            rows={2}
                        />
                    </div>
                    <Button
                        type="submit"
                        disabled={transferPoints.isPending || !isValid}
                    >
                        {transferPoints.isPending
                            ? t("pages.points.transferring")
                            : t("pages.points.transfer")}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
