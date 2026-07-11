import { useTranslation } from "react-i18next";
import type { GlobalStats } from "@workspace/shared/lib/hooks/useStats";
import { StatCard } from "@workspace/ui/components/stat-card";

export function DashboardStats({
    stats,
    statsLoading,
    uncoveredCount,
    uncoveredLoading,
}: {
    stats: GlobalStats | undefined;
    statsLoading: boolean;
    uncoveredCount: number | undefined;
    uncoveredLoading: boolean;
}) {
    const { t } = useTranslation();

    return (
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
                        ? t("adminPages.dashboard.stats.activeIncidentsHint", {
                              total: stats.incidents,
                          })
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
                loading={uncoveredLoading}
                value={uncoveredCount ?? "—"}
            />
        </div>
    );
}
