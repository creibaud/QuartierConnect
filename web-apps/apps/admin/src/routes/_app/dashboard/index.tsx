import type { ReactNode } from "react";
import { Add01Icon, CodeSquareIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { fetchIncidents } from "@workspace/shared/lib/api/incidents.api";
import { getCurrentUser } from "@workspace/shared/lib/auth";
import { useGlobalStats } from "@workspace/shared/lib/hooks/useStats";
import type { Incident } from "@workspace/shared/lib/types";
import { Button } from "@workspace/ui/components/button";
import {
    Card,
    CardAction,
    CardContent,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components/card";
import { DataState } from "@workspace/ui/components/data-state";
import { PageHeader } from "@workspace/ui/components/page-header";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { StatCard } from "@workspace/ui/components/stat-card";
import {
    StatusBadge,
    statusTone,
} from "@workspace/ui/components/status-badge";
import {
    useUncoveredAddresses,
    type UncoveredResident,
} from "@/features/uncovered-addresses/hooks/uncovered-addresses.hooks";

export const Route = createFileRoute("/_app/dashboard/")({
    component: AdminDashboardPage,
});

const RECENT_INCIDENTS_LIMIT = 5;
const PENDING_ADDRESSES_LIMIT = 3;

function useRecentIncidents() {
    return useQuery({
        queryKey: ["incidents", "recent", RECENT_INCIDENTS_LIMIT],
        queryFn: () => fetchIncidents(1, RECENT_INCIDENTS_LIMIT),
        staleTime: 30_000,
    });
}

function AdminDashboardPage() {
    const { t } = useTranslation();
    const user = getCurrentUser();
    const { data: stats, isLoading: statsLoading } = useGlobalStats();
    const uncoveredAddresses = useUncoveredAddresses();

    return (
        <div className="p-6">
            <div className="space-y-6">
                <PageHeader
                    title={t("adminPages.dashboard.title")}
                    description={user?.email}
                    actions={
                        <>
                            <Button asChild variant="outline">
                                <Link to="/dsl">
                                    <HugeiconsIcon icon={CodeSquareIcon} />
                                    {t("nav.dsl")}
                                </Link>
                            </Button>
                            <Button asChild>
                                <Link to="/neighborhoods">
                                    <HugeiconsIcon icon={Add01Icon} />
                                    {t("adminPages.neighborhoods.createCta")}
                                </Link>
                            </Button>
                        </>
                    }
                />

                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <StatCard
                        label={t("adminPages.dashboard.stats.users")}
                        loading={statsLoading}
                        value={stats?.users ?? "—"}
                    />
                    <StatCard
                        label={t("adminPages.dashboard.stats.activeIncidents")}
                        loading={statsLoading}
                        value={stats?.activeIncidents ?? "—"}
                        hint={
                            stats?.incidents != null
                                ? t(
                                      "adminPages.dashboard.stats.activeIncidentsHint",
                                      { total: stats.incidents },
                                  )
                                : undefined
                        }
                    />
                    <StatCard
                        label={t("adminPages.dashboard.stats.neighborhoods")}
                        loading={statsLoading}
                        value={stats?.neighborhoods ?? "—"}
                    />
                    <StatCard
                        label={t("adminPages.coverage.title")}
                        loading={uncoveredAddresses.isLoading}
                        value={uncoveredAddresses.data?.length ?? "—"}
                    />
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                    <RecentIncidentsCard />
                    <PendingAddressesCard
                        residents={uncoveredAddresses.data ?? []}
                        loading={uncoveredAddresses.isLoading}
                        error={uncoveredAddresses.isError ? true : undefined}
                        onRetry={() => uncoveredAddresses.refetch()}
                    />
                </div>
            </div>
        </div>
    );
}

function ListCard({
    title,
    seeAllTo,
    children,
}: {
    title: string;
    seeAllTo: string;
    children: ReactNode;
}) {
    const { t } = useTranslation();
    return (
        <Card className="gap-3">
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardAction>
                    <Button asChild variant="ghost" size="sm">
                        <Link to={seeAllTo}>
                            {t("adminPages.dashboard.seeAll")}
                        </Link>
                    </Button>
                </CardAction>
            </CardHeader>
            <CardContent>{children}</CardContent>
        </Card>
    );
}

function RowsSkeleton({ rows }: { rows: number }) {
    return (
        <div className="flex flex-col gap-2">
            {Array.from({ length: rows }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full rounded" />
            ))}
        </div>
    );
}

function RecentIncidentsCard() {
    const { t, i18n } = useTranslation();
    const { data, isLoading, isError, refetch } = useRecentIncidents();
    const incidents = data ?? [];

    return (
        <ListCard
            title={t("adminPages.dashboard.recentIncidents")}
            seeAllTo="/incidents"
        >
            <DataState
                loading={isLoading}
                error={isError ? true : undefined}
                isEmpty={incidents.length === 0}
                onRetry={() => refetch()}
                errorTitle={t("adminPages.incidents.loadError")}
                skeleton={<RowsSkeleton rows={RECENT_INCIDENTS_LIMIT} />}
                empty={
                    <p className="text-muted-foreground py-4 text-sm">
                        {t("adminPages.incidents.emptyTitle")}
                    </p>
                }
            >
                <ul className="divide-border divide-y">
                    {incidents.map((incident: Incident) => (
                        <li
                            key={incident.id}
                            className="flex items-center gap-3 py-2"
                        >
                            <span className="min-w-0 flex-1 truncate text-sm font-medium">
                                {incident.title}
                            </span>
                            <StatusBadge tone={statusTone(incident.status)}>
                                {t(`incidents.status.${incident.status}`)}
                            </StatusBadge>
                            <span className="text-muted-foreground text-xs tabular-nums">
                                {new Date(
                                    incident.createdAt,
                                ).toLocaleDateString(i18n.language)}
                            </span>
                        </li>
                    ))}
                </ul>
            </DataState>
        </ListCard>
    );
}

function PendingAddressesCard({
    residents,
    loading,
    error,
    onRetry,
}: {
    residents: UncoveredResident[];
    loading: boolean;
    error?: true;
    onRetry: () => void;
}) {
    const { t } = useTranslation();

    return (
        <ListCard
            title={t("adminPages.coverage.title")}
            seeAllTo="/uncovered-addresses"
        >
            <DataState
                loading={loading}
                error={error}
                isEmpty={residents.length === 0}
                onRetry={onRetry}
                errorTitle={t("adminPages.coverage.loadError")}
                skeleton={<RowsSkeleton rows={PENDING_ADDRESSES_LIMIT} />}
                empty={
                    <p className="text-muted-foreground py-4 text-sm">
                        {t("adminPages.coverage.emptyTitle")}
                    </p>
                }
            >
                <ul className="divide-border divide-y">
                    {residents
                        .slice(0, PENDING_ADDRESSES_LIMIT)
                        .map((resident) => (
                            <li
                                key={resident.userId}
                                className="flex items-center gap-3 py-2"
                            >
                                <span className="shrink-0 text-sm font-medium">
                                    {resident.firstName}
                                </span>
                                <span className="text-muted-foreground min-w-0 flex-1 truncate text-sm">
                                    {resident.address}
                                </span>
                            </li>
                        ))}
                </ul>
            </DataState>
        </ListCard>
    );
}
