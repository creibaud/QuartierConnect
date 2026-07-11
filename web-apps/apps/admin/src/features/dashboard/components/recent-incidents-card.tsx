import { useTranslation } from "react-i18next";
import type { Incident } from "@workspace/shared/lib/types";
import { DataState } from "@workspace/ui/components/data-state";
import {
    StatusBadge,
    statusTone,
} from "@workspace/ui/components/status-badge";
import { useRecentIncidents } from "../hooks/dashboard.hooks";
import { RECENT_INCIDENTS_LIMIT } from "../lib/constants";
import { ListCard } from "./list-card";
import { RowsSkeleton } from "./rows-skeleton";

export function RecentIncidentsCard() {
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
