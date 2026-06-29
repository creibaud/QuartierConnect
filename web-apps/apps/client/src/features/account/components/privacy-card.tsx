import { useState } from "react";
import {
    Delete02Icon,
    Download01Icon,
    SecurityIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { apiGet } from "@workspace/shared/lib/api";
import { useDeleteMyAccount } from "@workspace/shared/lib/hooks/useMe";
import type { UserExport } from "@workspace/shared/lib/types";
import { Button } from "@workspace/ui/components/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components/card";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Separator } from "@workspace/ui/components/separator";

export function PrivacyCard() {
    const { t } = useTranslation();
    const deleteAccount = useDeleteMyAccount();
    const [totpCode, setTotpCode] = useState("");
    const [exporting, setExporting] = useState(false);

    async function handleExport() {
        setExporting(true);
        try {
            const data = await apiGet<UserExport>("/users/me/export");
            const blob = new Blob([JSON.stringify(data, null, 2)], {
                type: "application/json",
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "quartierconnect-mes-donnees.json";
            link.click();
            URL.revokeObjectURL(url);
        } catch {
            toast.error(t("pages.account.deleteConfirmDescription"));
        } finally {
            setExporting(false);
        }
    }

    function handleDelete() {
        deleteAccount.mutate(totpCode, {
            onError: () => toast.error(t("auth.errors.invalidTotpCheckApp")),
        });
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <HugeiconsIcon
                        icon={SecurityIcon}
                        className="text-primary size-5"
                    />
                    {t("pages.account.privacy")}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-sm font-medium">
                            {t("pages.account.exportData")}
                        </p>
                        <p className="text-muted-foreground text-sm">
                            {t("pages.account.exportDescription")}
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        onClick={handleExport}
                        disabled={exporting}
                        className="shrink-0"
                    >
                        <HugeiconsIcon icon={Download01Icon} className="size-4" />
                        {t("pages.account.exportData")}
                    </Button>
                </div>

                <Separator />

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-destructive text-sm font-medium">
                            {t("pages.account.deleteAccount")}
                        </p>
                        <p className="text-muted-foreground text-sm">
                            {t("pages.account.deleteDescription")}
                        </p>
                    </div>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="destructive" className="shrink-0">
                                <HugeiconsIcon
                                    icon={Delete02Icon}
                                    className="size-4"
                                />
                                {t("pages.account.deleteAccount")}
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>
                                    {t("pages.account.deleteConfirmTitle")}
                                </DialogTitle>
                                <DialogDescription>
                                    {t("pages.account.deleteConfirmDescription")}
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-2">
                                <Label htmlFor="delete-totp">
                                    {t("pages.account.totpLabel")}
                                </Label>
                                <Input
                                    id="delete-totp"
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    maxLength={6}
                                    value={totpCode}
                                    onChange={(e) =>
                                        setTotpCode(
                                            e.target.value.replace(/\D/g, ""),
                                        )
                                    }
                                    placeholder="000000"
                                />
                            </div>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button variant="outline">
                                        {t("pages.account.cancel")}
                                    </Button>
                                </DialogClose>
                                <Button
                                    variant="destructive"
                                    onClick={handleDelete}
                                    disabled={
                                        totpCode.length !== 6 ||
                                        deleteAccount.isPending
                                    }
                                >
                                    {t("pages.account.confirmDelete")}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardContent>
        </Card>
    );
}
