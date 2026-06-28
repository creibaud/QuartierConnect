import { UserIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { useTranslation } from "react-i18next";
import { getCurrentUser } from "@workspace/shared/lib/auth";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components/card";
import { PageHeader } from "@workspace/ui/components/page-header";
import { PrivacyCard } from "@/features/account/components/privacy-card";
import { SecurityCard } from "@/features/account/components/security-card";

export function AccountPage() {
    const { t } = useTranslation();
    const reduce = useReducedMotion();
    const user = getCurrentUser();

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
                    <SecurityCard />
                </motion.div>

                <motion.div variants={fadeUp}>
                    <PrivacyCard />
                </motion.div>
            </motion.div>
        </div>
    );
}
