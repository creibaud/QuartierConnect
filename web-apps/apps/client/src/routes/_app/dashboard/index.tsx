import { useState, type ReactNode } from "react";
import {
    Calendar01Icon,
    Coins01Icon,
    CustomerServiceIcon,
    SparklesIcon,
    ThumbsUpIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { useTranslation } from "react-i18next";
import { apiGet } from "@workspace/shared/lib/api";
import { getCurrentUser } from "@workspace/shared/lib/auth";
import { useEvents } from "@workspace/shared/lib/hooks/events.hooks";
import {
    usePointBalance,
    usePointsHistory,
} from "@workspace/shared/lib/hooks/points.hooks";
import { useServices } from "@workspace/shared/lib/hooks/services.hooks";
import { useRecommendations } from "@workspace/shared/lib/hooks/useRecommendations";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components/card";
import { PageHeader } from "@workspace/ui/components/page-header";
import { Skeleton } from "@workspace/ui/components/skeleton";

interface CommunityVote {
    _id: string;
    title: string;
    status: "open" | "closed";
}

export const Route = createFileRoute("/_app/dashboard/")({
    component: DashboardPage,
});

function FeedCard({
    title,
    to,
    icon,
    children,
}: {
    title: string;
    to: string;
    icon: IconSvgElement;
    children: ReactNode;
}) {
    const { t } = useTranslation();
    return (
        <Card className="h-full">
            <CardHeader>
                <div className="flex items-center justify-between gap-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <HugeiconsIcon
                            icon={icon}
                            className="text-primary size-5"
                        />
                        {title}
                    </CardTitle>
                    <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground -mr-2 text-xs"
                    >
                        <Link to={to}>{t("pages.dashboard.seeAll")}</Link>
                    </Button>
                </div>
            </CardHeader>
            <CardContent>{children}</CardContent>
        </Card>
    );
}

function Rows({ count = 3 }: { count?: number }) {
    return (
        <div className="space-y-2">
            {Array.from({ length: count }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full rounded" />
            ))}
        </div>
    );
}

function EmptyBlock({ icon, text }: { icon: IconSvgElement; text: string }) {
    return (
        <div className="text-muted-foreground flex flex-col items-center gap-2 py-6 text-center text-sm">
            <HugeiconsIcon icon={icon} className="size-7 opacity-30" />
            {text}
        </div>
    );
}

function DashboardPage() {
    const { t } = useTranslation();
    const reduce = useReducedMotion();
    const [now] = useState(() => Date.now());
    const user = getCurrentUser();

    const { data: balance } = usePointBalance();
    const { data: history, isLoading: historyLoading } = usePointsHistory(1, 5);
    const { data: events, isLoading: eventsLoading } = useEvents();
    const { data: services, isLoading: servicesLoading } = useServices();
    const { data: recommendations, isLoading: recoLoading } =
        useRecommendations();
    const { data: votes, isLoading: votesLoading } = useQuery<CommunityVote[]>({
        queryKey: ["community-votes"],
        queryFn: () => apiGet<CommunityVote[]>("/community-votes"),
    });

    if (!user) return null;

    const roleLabels: Record<string, string> = {
        resident: t("roles.resident"),
        moderator: t("roles.moderator"),
        admin: t("roles.admin"),
    };
    const roleLabel = roleLabels[user.role] ?? user.role;

    const transactions = (history ?? []).slice(0, 4);
    const upcomingEvents = (events ?? [])
        .filter((e) => new Date(e.date).getTime() >= now)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 4);
    const openVotes = (votes ?? [])
        .filter((v) => v.status === "open")
        .slice(0, 4);
    const someServices = (services ?? []).slice(0, 4);
    const topRecommendations = (recommendations ?? []).slice(0, 4);

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
        <div className="mx-auto w-full max-w-5xl space-y-6 p-6 md:p-8">
            <motion.div
                initial={{ opacity: 0, y: reduce ? 0 : 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 240, damping: 26 }}
            >
                <PageHeader
                    title={
                        user.firstName
                            ? `${t("pages.dashboard.welcome")} ${user.firstName}`
                            : t("pages.dashboard.welcome")
                    }
                    description={user.email}
                    actions={<Badge variant="secondary">{roleLabel}</Badge>}
                />
            </motion.div>

            <motion.div
                variants={stagger}
                initial="hidden"
                animate="visible"
                className="grid gap-4 lg:grid-cols-2"
            >
                {/* Mes points + dernières transactions (pleine largeur) */}
                <motion.div variants={fadeUp} className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <HugeiconsIcon
                                    icon={Coins01Icon}
                                    className="text-primary size-5"
                                />
                                {t("pages.dashboard.yourPoints")}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-6 sm:grid-cols-2">
                                <div className="flex flex-col justify-center">
                                    <p className="font-heading text-5xl font-semibold tabular-nums">
                                        {balance?.balance ?? "—"}
                                    </p>
                                    <p className="text-muted-foreground mt-1 text-sm">
                                        {t(
                                            "pages.dashboard.participationPoints",
                                        )}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
                                        {t(
                                            "pages.dashboard.recentTransactions",
                                        )}
                                    </p>
                                    {historyLoading ? (
                                        <Rows count={3} />
                                    ) : transactions.length === 0 ? (
                                        <p className="text-muted-foreground text-sm">
                                            {t("pages.dashboard.noTransactions")}
                                        </p>
                                    ) : (
                                        <ul className="space-y-1.5">
                                            {transactions.map((tx) => {
                                                const received =
                                                    tx.recipientEmail ===
                                                    user.email;
                                                const other = received
                                                    ? tx.senderEmail
                                                    : tx.recipientEmail;
                                                return (
                                                    <li
                                                        key={tx.id}
                                                        className="flex items-center justify-between gap-2 text-sm"
                                                    >
                                                        <span className="text-muted-foreground truncate">
                                                            {other ?? "—"}
                                                        </span>
                                                        <span className="font-medium tabular-nums">
                                                            {received
                                                                ? "+"
                                                                : "−"}
                                                            {Math.abs(
                                                                tx.amount,
                                                            )}
                                                        </span>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Votes en cours */}
                <motion.div variants={fadeUp}>
                    <FeedCard
                        title={t("pages.dashboard.openVotes")}
                        to="/votes"
                        icon={ThumbsUpIcon}
                    >
                        {votesLoading ? (
                            <Rows count={3} />
                        ) : openVotes.length === 0 ? (
                            <EmptyBlock
                                icon={ThumbsUpIcon}
                                text={t("pages.dashboard.noOpenVotes")}
                            />
                        ) : (
                            <ul className="space-y-2">
                                {openVotes.map((v) => (
                                    <li
                                        key={v._id}
                                        className="flex items-center justify-between gap-2"
                                    >
                                        <span className="truncate text-sm font-medium">
                                            {v.title}
                                        </span>
                                        <Button
                                            asChild
                                            size="sm"
                                            variant="outline"
                                            className="shrink-0"
                                        >
                                            <Link to="/votes">
                                                {t("pages.dashboard.respond")}
                                            </Link>
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </FeedCard>
                </motion.div>

                {/* Prochains événements */}
                <motion.div variants={fadeUp}>
                    <FeedCard
                        title={t("pages.dashboard.upcomingEvents")}
                        to="/events"
                        icon={Calendar01Icon}
                    >
                        {eventsLoading ? (
                            <Rows count={3} />
                        ) : upcomingEvents.length === 0 ? (
                            <EmptyBlock
                                icon={Calendar01Icon}
                                text={t("pages.dashboard.noUpcomingEvents")}
                            />
                        ) : (
                            <ul className="space-y-2">
                                {upcomingEvents.map((e) => (
                                    <li
                                        key={e._id}
                                        className="flex items-center justify-between gap-3 text-sm"
                                    >
                                        <span className="truncate font-medium">
                                            {e.title}
                                        </span>
                                        <span className="text-muted-foreground shrink-0 text-xs">
                                            {new Date(
                                                e.date,
                                            ).toLocaleDateString(undefined, {
                                                day: "numeric",
                                                month: "short",
                                            })}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </FeedCard>
                </motion.div>

                {/* Services du quartier */}
                <motion.div variants={fadeUp}>
                    <FeedCard
                        title={t("pages.dashboard.neighborhoodServices")}
                        to="/services"
                        icon={CustomerServiceIcon}
                    >
                        {servicesLoading ? (
                            <Rows count={3} />
                        ) : someServices.length === 0 ? (
                            <EmptyBlock
                                icon={CustomerServiceIcon}
                                text={t("pages.dashboard.noServices")}
                            />
                        ) : (
                            <ul className="space-y-2">
                                {someServices.map((s) => (
                                    <li
                                        key={s._id}
                                        className="flex items-center justify-between gap-2 text-sm"
                                    >
                                        <span className="truncate font-medium">
                                            {s.title}
                                        </span>
                                        <Badge
                                            variant="secondary"
                                            className="shrink-0 text-xs"
                                        >
                                            {s.category}
                                        </Badge>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </FeedCard>
                </motion.div>

                {/* Recommandations pour toi */}
                <motion.div variants={fadeUp}>
                    <FeedCard
                        title={t("pages.dashboard.recommendationsForYou")}
                        to="/recommendations"
                        icon={SparklesIcon}
                    >
                        {recoLoading ? (
                            <Rows count={3} />
                        ) : topRecommendations.length === 0 ? (
                            <EmptyBlock
                                icon={SparklesIcon}
                                text={t("pages.dashboard.noRecommendations")}
                            />
                        ) : (
                            <ul className="space-y-2.5">
                                {topRecommendations.map((r) => (
                                    <li key={r.id} className="space-y-0.5">
                                        <p className="truncate text-sm font-medium">
                                            {r.name}
                                        </p>
                                        <p className="text-muted-foreground truncate text-xs">
                                            {r.reason}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </FeedCard>
                </motion.div>
            </motion.div>
        </div>
    );
}
