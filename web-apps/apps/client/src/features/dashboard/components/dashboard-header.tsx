import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { Badge } from "@workspace/ui/components/badge";
import { PageHeader } from "@workspace/ui/components/page-header";

export function DashboardHeader({
    firstName,
    email,
    roleLabel,
    reduce,
}: {
    firstName?: string;
    email: string;
    roleLabel: string;
    reduce: boolean | null;
}) {
    const { t } = useTranslation();
    return (
        <motion.div
            initial={{ opacity: 0, y: reduce ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 26 }}
        >
            <PageHeader
                title={
                    firstName
                        ? `${t("pages.dashboard.welcome")} ${firstName}`
                        : t("pages.dashboard.welcome")
                }
                description={email}
                actions={<Badge variant="secondary">{roleLabel}</Badge>}
            />
        </motion.div>
    );
}
