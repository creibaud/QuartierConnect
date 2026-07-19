import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useTransferPoints } from "@workspace/shared/lib/hooks/points.hooks";
import type { UserSearchResult } from "@workspace/shared/lib/hooks/useUserSearch";
import { Button } from "@workspace/ui/components/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { toast } from "sonner";
import { UserPicker } from "@/components/user-picker";
import { MAX_TRANSFER_AMOUNT, TRANSFER_ERROR_KEYS } from "../lib/transfer";

export function TransferForm() {
    const { t } = useTranslation();
    const [recipient, setRecipient] = useState<UserSearchResult | null>(null);
    const [amount, setAmount] = useState("");
    const [note, setNote] = useState("");
    const transferPoints = useTransferPoints();

    const parsedAmount = Number(amount);
    const isValid =
        recipient !== null &&
        Number.isInteger(parsedAmount) &&
        parsedAmount >= 1 &&
        parsedAmount <= MAX_TRANSFER_AMOUNT;

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!isValid || recipient === null) return;
        transferPoints.mutate(
            {
                recipientId: recipient.id,
                amount: parsedAmount,
                note: note.trim() || undefined,
            },
            {
                onSuccess: () => {
                    toast.success(t("pages.points.transferSuccess"));
                    setRecipient(null);
                    setAmount("");
                    setNote("");
                },
                onError: (error: Error) => {
                    const code = (error as { code?: string }).code;
                    const key = code ? TRANSFER_ERROR_KEYS[code] : undefined;
                    toast.error(key ? t(key) : t("pages.points.transferError"));
                },
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
                <form onSubmit={handleSubmit} className="max-w-md space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="points-recipient">
                            {t("pages.points.recipientLabel")}
                        </Label>
                        <UserPicker
                            id="points-recipient"
                            selected={recipient}
                            onSelect={setRecipient}
                            placeholder={t("pages.points.recipientPlaceholder")}
                        />
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
