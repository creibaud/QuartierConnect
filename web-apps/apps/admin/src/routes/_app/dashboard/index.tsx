import {
    Alert01Icon,
    Building01Icon,
    Calendar01Icon,
    CodeSquareIcon,
    CustomerServiceIcon,
    UserMultipleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { getCurrentUser } from "@workspace/shared/lib/auth";
import { useGlobalStats } from "@workspace/shared/lib/hooks/useStats";
import { Badge } from "@workspace/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { PageHeader } from "@workspace/ui/components/page-header";
import { StatCard } from "@workspace/ui/components/stat-card";

export const Route = createFileRoute("/_app/dashboard/")({
    component: AdminDashboardPage,
});

const STAT_META = [
    { labelKey: "adminPages.dashboard.stats.users", key: "users" as const },
    {
        labelKey: "adminPages.dashboard.stats.activeIncidents",
        key: "activeIncidents" as const,
    },
    {
        labelKey: "adminPages.dashboard.stats.incidents",
        key: "incidents" as const,
    },
    {
        labelKey: "adminPages.dashboard.stats.neighborhoods",
        key: "neighborhoods" as const,
    },
];

interface QuickLink {
    to: string;
    labelKey: string;
    descKey: string;
    icon: IconSvgElement;
}

const QUICK_LINKS: QuickLink[] = [
    {
        to: "/users",
        labelKey: "adminPages.dashboard.quickLinks.users.label",
        descKey: "adminPages.dashboard.quickLinks.users.desc",
        icon: UserMultipleIcon,
    },
    {
        to: "/incidents",
        labelKey: "adminPages.dashboard.quickLinks.incidents.label",
        descKey: "adminPages.dashboard.quickLinks.incidents.desc",
        icon: Alert01Icon,
    },
    {
        to: "/neighborhoods",
        labelKey: "adminPages.dashboard.quickLinks.neighborhoods.label",
        descKey: "adminPages.dashboard.quickLinks.neighborhoods.desc",
        icon: Building01Icon,
    },
    {
        to: "/services",
        labelKey: "adminPages.dashboard.quickLinks.services.label",
        descKey: "adminPages.dashboard.quickLinks.services.desc",
        icon: CustomerServiceIcon,
    },
    {
        to: "/events",
        labelKey: "adminPages.dashboard.quickLinks.events.label",
        descKey: "adminPages.dashboard.quickLinks.events.desc",
        icon: Calendar01Icon,
    },
    {
        to: "/dsl",
        labelKey: "adminPages.dashboard.quickLinks.dsl.label",
        descKey: "adminPages.dashboard.quickLinks.dsl.desc",
        icon: CodeSquareIcon,
    },
];

function AdminDashboardPage() {
    const { t } = useTranslation();
    const user = getCurrentUser();
    const { data: stats, isLoading } = useGlobalStats();

    return (
        <div className="p-6">
            <div className="mx-auto max-w-5xl space-y-6">
                <PageHeader
                    title={t("adminPages.dashboard.title")}
                    description={user?.email}
                    actions={
                        <Badge variant="secondary">
                            {t("adminPages.roles.admin")}
                        </Badge>
                    }
                />

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {STAT_META.map((meta) => {
                        const value = stats?.[meta.key];
                        return (
                            <StatCard
                                key={meta.key}
                                label={t(meta.labelKey)}
                                loading={isLoading}
                                value={value ?? "—"}
                            />
                        );
                    })}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {QUICK_LINKS.map((item) => (
                        <Link key={item.to} to={item.to} className="group">
                            <Card className="hover:border-primary/40 hover:bg-accent/40 h-full transition-colors">
                                <CardHeader className="flex-row items-center gap-3 space-y-0 pb-2">
                                    <div className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
                                        <HugeiconsIcon
                                            icon={item.icon}
                                            className="size-5"
                                        />
                                    </div>
                                    <CardTitle className="text-base">
                                        {t(item.labelKey)}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground text-sm">
                                        {t(item.descKey)}
                                    </p>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
