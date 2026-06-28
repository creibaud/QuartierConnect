import { useState } from "react";
import {
    Delete02Icon,
    Download01Icon,
    SecurityIcon,
    SecurityLockIcon,
    UserIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute } from "@tanstack/react-router";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { apiGet } from "@workspace/shared/lib/api";
import { getCurrentUser } from "@workspace/shared/lib/auth";
import { useDeleteMyAccount } from "@workspace/shared/lib/hooks/useMe";
import type { UserExport } from "@workspace/shared/lib/types";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
    Card,
    CardContent,
    CardDescription,
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
import { PageHeader } from "@workspace/ui/components/page-header";
import { Separator } from "@workspace/ui/components/separator";

export const Route = createFileRoute("/_app/settings/")({
    component: AccountPage,
});

function AccountPage() {
    const { t } = useTranslation();
    const reduce = useReducedMotion();
    const user = getCurrentUser();
    const deleteAccount = useDeleteMyAccount();
    const [totpCode, setTotpCode] = useState("");
    const [exporting, setExporting] = useState(false);

    if (!user) return null;

    const fullName = [user.firstName, user.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();
    const displayName = fullName || user.email;
    const initials = fullName
        ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase()
        : user.email.slice(0, 2).toUpperCase();
    const roleLabels: Record<string, string> = {
        resident: t("roles.resident"),
        moderator: t("roles.moderator"),
        admin: t("roles.admin"),
    };
    const roleLabel = roleLabels[user.role] ?? user.role;

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

    const stagger: Variants = {
        hidden: {},
        visible: { transition: { staggerChildren: reduce ? 0 : 0.07 } },
    };
    const fadeUp: Variants = {
        hidden: { opacity: 0, y: reduce ? 0 : 14 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { type: "spring", stiffness: 240, damping: 26 },
        },
    };

    return (
        <div className="mx-auto w-full max-w-3xl p-6 md:p-8">
            <motion.div
                variants={stagger}
                initial="hidden"
                animate="visible"
                className="space-y-6"
            >
                <motion.div variants={fadeUp}>
                    <PageHeader
                        title={t("pages.account.title")}
                        description={t("pages.account.subtitle")}
                    />
                </motion.div>

                <motion.div variants={fadeUp}>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <HugeiconsIcon
                                    icon={UserIcon}
                                    className="text-primary size-5"
                                />
                                {t("pages.account.profile")}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-4">
                                <Avatar className="size-14 rounded-xl">
                                    <AvatarFallback className="rounded-xl text-lg">
                                        {initials}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                    <p className="font-heading truncate text-lg font-semibold">
                                        {displayName}
                                    </p>
                                    <p className="text-muted-foreground truncate text-sm">
                                        {user.email}
                                    </p>
                                </div>
                                <Badge
                                    variant="secondary"
                                    className="ml-auto shrink-0"
                                >
                                    {roleLabel}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div variants={fadeUp}>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <HugeiconsIcon
                                    icon={SecurityLockIcon}
                                    className="text-primary size-5"
                                />
                                {t("pages.account.security")}
                            </CardTitle>
                            <CardDescription>
                                {t("pages.account.securitySoon")}
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </motion.div>

                <motion.div variants={fadeUp}>
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
                                    <HugeiconsIcon
                                        icon={Download01Icon}
                                        className="size-4"
                                    />
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
                                        <Button
                                            variant="destructive"
                                            className="shrink-0"
                                        >
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
                                                {t(
                                                    "pages.account.deleteConfirmTitle",
                                                )}
                                            </DialogTitle>
                                            <DialogDescription>
                                                {t(
                                                    "pages.account.deleteConfirmDescription",
                                                )}
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
                                                        e.target.value.replace(
                                                            /\D/g,
                                                            "",
                                                        ),
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
                                                {t(
                                                    "pages.account.confirmDelete",
                                                )}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </motion.div>
        </div>
    );
}
