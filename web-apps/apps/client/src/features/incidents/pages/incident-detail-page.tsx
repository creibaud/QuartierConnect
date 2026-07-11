import { useTranslation } from "react-i18next";
import { Tag01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useIncident } from "@workspace/shared/lib/hooks/incidents.hooks";
import { Badge } from "@workspace/ui/components/badge";
import {
    Card,
    CardContent,
    CardHeader,
} from "@workspace/ui/components/card";
import { DataState } from "@workspace/ui/components/data-state";
import { PageHeader } from "@workspace/ui/components/page-header";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { StatusBadge, statusTone } from "@workspace/ui/components/status-badge";
import { IncidentDescriptionCard } from "../components/incident-description-card";
import { IncidentLocationCard } from "../components/incident-location-card";
import { incidentStatusLabels } from "../lib/status-labels";

export function IncidentDetailPage({ id }: { id: string }) {
    const { t, i18n } = useTranslation();
    const statusLabels = incidentStatusLabels(t);

    const { data: incident, isLoading, isError, refetch } = useIncident(id);

    return (
        <div className="p-6 md:p-8">
            <div className="mx-auto flex max-w-7xl flex-col gap-6">
                <PageHeader
                    title={incident?.title ?? t("pages.incidentDetail.title")}
                    description={
                        incident
                            ? t("pages.incidentDetail.reportedOn", {
                                  date: new Date(
                                      incident.createdAt,
                                  ).toLocaleDateString(i18n.language),
                              })
                            : undefined
                    }
                    actions={
                        incident ? (
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline">
                                    <HugeiconsIcon icon={Tag01Icon} />
                                    {t(
                                        `pages.incidents.categories.${incident.category}`,
                                    )}
                                </Badge>
                                <StatusBadge tone={statusTone(incident.status)}>
                                    {statusLabels[incident.status] ??
                                        incident.status}
                                </StatusBadge>
                            </div>
                        ) : undefined
                    }
                />

                <DataState
                    loading={isLoading}
                    error={
                        isError || (!isLoading && !incident) ? true : undefined
                    }
                    onRetry={() => refetch()}
                    errorTitle={t("pages.incidentDetail.notFound")}
                    skeleton={
                        <Card>
                            <CardHeader>
                                <Skeleton className="h-6 w-3/4" />
                                <Skeleton className="mt-2 h-4 w-1/4" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-20 w-full" />
                            </CardContent>
                        </Card>
                    }
                >
                    {incident && (
                        <div className="flex flex-col gap-6">
                            <IncidentDescriptionCard incident={incident} />

                            {incident.lat !== null &&
                                incident.lng !== null && (
                                    <IncidentLocationCard
                                        lat={incident.lat}
                                        lng={incident.lng}
                                    />
                                )}
                        </div>
                    )}
                </DataState>
            </div>
        </div>
    );
}
