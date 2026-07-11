import {
    UserBlock01Icon,
    UserCheck01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslation } from "react-i18next";
import type { User } from "@workspace/shared/lib/types";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog";
import { Button } from "@workspace/ui/components/button";

export function UserBanDialog({
    user,
    disabled,
    onConfirm,
}: {
    user: User;
    disabled: boolean;
    onConfirm: () => void;
}) {
    const { t } = useTranslation();
    const isBanned = user.role === "banned";

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button
                    variant={isBanned ? "outline" : "destructive"}
                    size="sm"
                    className="h-8 text-xs"
                    disabled={disabled}
                >
                    <HugeiconsIcon
                        icon={isBanned ? UserCheck01Icon : UserBlock01Icon}
                    />
                    {isBanned
                        ? t("adminPages.users.reactivate")
                        : t("adminPages.users.ban")}
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        {isBanned
                            ? t("adminPages.users.reactivateConfirmTitle")
                            : t("adminPages.users.banConfirmTitle")}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {isBanned
                            ? t("adminPages.users.reactivateConfirmDescription", {
                                  email: user.email,
                              })
                            : t("adminPages.users.banConfirmDescription", {
                                  email: user.email,
                              })}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                        variant={isBanned ? "default" : "destructive"}
                        onClick={onConfirm}
                    >
                        {isBanned
                            ? t("adminPages.users.reactivate")
                            : t("adminPages.users.ban")}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
