import { useState, type FormEvent } from "react";
import { SecurityLockIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useChangePassword } from "@workspace/shared/lib/hooks/useMe";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Separator } from "@workspace/ui/components/separator";
import { PasswordStrengthMeter } from "@/features/account/components/password-strength-meter";

export function SecurityCard() {
    const { t } = useTranslation();
    const changePassword = useChangePassword();
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    function handleSubmit(event: FormEvent) {
        event.preventDefault();
        if (newPassword !== confirmPassword) {
            toast.error(t("pages.account.passwordMismatch"));
            return;
        }
        changePassword.mutate(
            { currentPassword, newPassword },
            {
                onSuccess: () => {
                    toast.success(t("pages.account.passwordUpdated"));
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                },
                onError: () =>
                    toast.error(t("pages.account.currentPasswordWrong")),
            },
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <HugeiconsIcon
                        icon={SecurityLockIcon}
                        className="text-primary size-5"
                    />
                    {t("pages.account.security")}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="space-y-2">
                        <Label htmlFor="current-password">
                            {t("pages.account.currentPassword")}
                        </Label>
                        <Input
                            id="current-password"
                            type="password"
                            autoComplete="current-password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="new-password">
                                {t("pages.account.newPassword")}
                            </Label>
                            <Input
                                id="new-password"
                                type="password"
                                autoComplete="new-password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirm-password">
                                {t("pages.account.confirmNewPassword")}
                            </Label>
                            <Input
                                id="confirm-password"
                                type="password"
                                autoComplete="new-password"
                                value={confirmPassword}
                                onChange={(e) =>
                                    setConfirmPassword(e.target.value)
                                }
                            />
                        </div>
                    </div>
                    <PasswordStrengthMeter password={newPassword} />
                    <Button
                        type="submit"
                        disabled={
                            changePassword.isPending ||
                            !currentPassword ||
                            newPassword.length < 8 ||
                            newPassword !== confirmPassword
                        }
                    >
                        {t("pages.account.updatePassword")}
                    </Button>
                </form>

                <Separator />

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-sm font-medium">
                            {t("pages.account.twoFactor")}
                        </p>
                        <p className="text-muted-foreground text-sm">
                            {t("pages.account.twoFactorOn")}
                        </p>
                    </div>
                    <Badge
                        variant="secondary"
                        className="bg-primary/10 text-primary shrink-0"
                    >
                        {t("pages.account.enabled")}
                    </Badge>
                </div>
            </CardContent>
        </Card>
    );
}
