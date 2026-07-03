import { useState, type FormEvent } from "react";
import { Mail01Icon, PencilEdit02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { clearTokens, getCurrentUser } from "@workspace/shared/lib/auth";
import { useChangeEmail, useMyProfile } from "@workspace/shared/lib/hooks/useMe";
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
import {
    TOTP_LENGTH,
    TotpCodeField,
} from "@/features/account/components/totp-code-field";

export function EmailCard() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { data: profile } = useMyProfile();
    const changeEmail = useChangeEmail();

    const [open, setOpen] = useState(false);
    const [newEmail, setNewEmail] = useState("");
    const [password, setPassword] = useState("");
    const [totpCode, setTotpCode] = useState("");

    const currentEmail = profile?.email ?? getCurrentUser()?.email ?? "";

    function resetForm() {
        setNewEmail("");
        setPassword("");
        setTotpCode("");
    }

    function handleOpenChange(nextOpen: boolean) {
        setOpen(nextOpen);
        if (!nextOpen) resetForm();
    }

    function handleSubmit(event: FormEvent) {
        event.preventDefault();
        changeEmail.mutate(
            { newEmail: newEmail.trim(), password, totpCode },
            {
                onSuccess: async () => {
                    setOpen(false);
                    toast.success(t("pages.account.emailUpdatedReconnect"));
                    clearTokens();
                    await navigate({ to: "/login" });
                    queryClient.clear();
                },
                onError: (err) => {
                    const apiErr = err as { code?: string };
                    toast.error(
                        apiErr.code === "EMAIL_ALREADY_EXISTS"
                            ? t("auth.errors.emailExists")
                            : t("pages.account.emailUpdateRejected"),
                    );
                    setTotpCode("");
                },
            },
        );
    }

    const submitDisabled =
        changeEmail.isPending ||
        !newEmail.includes("@") ||
        !password ||
        totpCode.length !== TOTP_LENGTH;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <HugeiconsIcon
                        icon={Mail01Icon}
                        className="text-primary size-5"
                    />
                    {t("pages.account.emailCardTitle")}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                            {currentEmail}
                        </p>
                        <p className="text-muted-foreground text-sm">
                            {t("pages.account.emailDescription")}
                        </p>
                    </div>
                    <Dialog open={open} onOpenChange={handleOpenChange}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="shrink-0">
                                <HugeiconsIcon
                                    icon={PencilEdit02Icon}
                                    className="size-4"
                                />
                                {t("pages.account.edit")}
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <DialogHeader>
                                    <DialogTitle>
                                        {t("pages.account.changeEmail")}
                                    </DialogTitle>
                                    <DialogDescription>
                                        {t(
                                            "pages.account.emailChangeDescription",
                                        )}
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-2">
                                    <Label htmlFor="new-email">
                                        {t("pages.account.newEmailLabel")}
                                    </Label>
                                    <Input
                                        id="new-email"
                                        type="email"
                                        autoComplete="email"
                                        value={newEmail}
                                        onChange={(e) =>
                                            setNewEmail(e.target.value)
                                        }
                                        placeholder="alice@demo.fr"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email-password">
                                        {t("auth.password")}
                                    </Label>
                                    <Input
                                        id="email-password"
                                        type="password"
                                        autoComplete="current-password"
                                        value={password}
                                        onChange={(e) =>
                                            setPassword(e.target.value)
                                        }
                                    />
                                </div>
                                <TotpCodeField
                                    label={t(
                                        "pages.account.totpVerificationLabel",
                                    )}
                                    value={totpCode}
                                    onChange={setTotpCode}
                                />
                                <DialogFooter>
                                    <DialogClose asChild>
                                        <Button type="button" variant="outline">
                                            {t("pages.account.cancel")}
                                        </Button>
                                    </DialogClose>
                                    <Button
                                        type="submit"
                                        disabled={submitDisabled}
                                    >
                                        {t("pages.account.changeEmail")}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardContent>
        </Card>
    );
}
