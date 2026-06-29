import { motion, useReducedMotion, type Variants } from "motion/react";
import { useTranslation } from "react-i18next";
import { getCurrentUser } from "@workspace/shared/lib/auth";
import { PageHeader } from "@workspace/ui/components/page-header";
import { NeighborhoodCard } from "@/features/account/components/neighborhood-card";
import { NeighborhoodMapCard } from "@/features/account/components/neighborhood-map-card";
import { PrivacyCard } from "@/features/account/components/privacy-card";
import { ProfileCard } from "@/features/account/components/profile-card";
import { SecurityCard } from "@/features/account/components/security-card";

export function AccountPage() {
    const { t } = useTranslation();
    const reduce = useReducedMotion();
    const user = getCurrentUser();

    if (!user) return null;

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
                    <ProfileCard />
                </motion.div>

                <motion.div variants={fadeUp}>
                    <NeighborhoodCard />
                </motion.div>

                <motion.div variants={fadeUp}>
                    <NeighborhoodMapCard />
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
