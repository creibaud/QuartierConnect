import { useState } from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { useTranslation } from "react-i18next";
import { getCurrentUser } from "@workspace/shared/lib/auth";
import { useMyProfile } from "@workspace/shared/lib/hooks/useMe";
import { isStaffRole } from "../lib/dashboard-role";
import { DashboardHeader } from "../components/dashboard-header";
import { ModerationOverview } from "../components/moderation-overview";
import { PointsSummaryCard } from "../components/points-summary-card";
import { TransactionsCard } from "../components/transactions-card";
import { OpenVotesCard } from "../components/open-votes-card";
import { UpcomingEventsCard } from "../components/upcoming-events-card";
import { ServicesCard } from "../components/services-card";
import { RecommendationsCard } from "../components/recommendations-card";
import { CommunityMapCard } from "../components/community-map-card";

export function DashboardPage() {
    const { t } = useTranslation();
    const reduce = useReducedMotion();
    const [now] = useState(() => Date.now());
    const user = getCurrentUser();
    const { data: profile } = useMyProfile();

    if (!user) return null;

    const roleLabels: Record<string, string> = {
        resident: t("roles.resident"),
        moderator: t("roles.moderator"),
        admin: t("roles.admin"),
    };
    const roleLabel = roleLabels[user.role] ?? user.role;
    const firstName = profile?.firstName ?? user.firstName;
    const staff = isStaffRole(user.role);

    const stagger: Variants = {
        hidden: {},
        visible: { transition: { staggerChildren: reduce ? 0 : 0.07 } },
    };
    const fadeUp: Variants = {
        hidden: { opacity: 0, y: reduce ? 0 : 16 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { type: "spring", stiffness: 240, damping: 26 },
        },
    };

    return (
        <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6 md:p-8">
            <CommunityMapCard />
            <DashboardHeader
                firstName={firstName}
                email={user.email}
                roleLabel={roleLabel}
                reduce={reduce}
            />

            {staff && <ModerationOverview now={now} />}

            <motion.div
                variants={stagger}
                initial="hidden"
                animate="visible"
                className="grid gap-4 lg:grid-cols-2"
            >
                <motion.div variants={fadeUp}>
                    <PointsSummaryCard />
                </motion.div>
                <motion.div variants={fadeUp}>
                    <TransactionsCard currentEmail={user.email} />
                </motion.div>
                <motion.div variants={fadeUp}>
                    <OpenVotesCard />
                </motion.div>
                <motion.div variants={fadeUp}>
                    <UpcomingEventsCard now={now} />
                </motion.div>
                <motion.div variants={fadeUp}>
                    <ServicesCard />
                </motion.div>
                <motion.div variants={fadeUp}>
                    <RecommendationsCard />
                </motion.div>
            </motion.div>
        </div>
    );
}
