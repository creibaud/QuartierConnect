import { useState } from "react";
import { Alert01Icon, ListViewIcon, MapsLocation01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { centroidOf } from "@workspace/shared/lib/geo";
import {
    useInfiniteIncidents,
    useUpdateIncidentStatus,
} from "@workspace/shared/lib/hooks/incidents.hooks";
import { useNeighborhoods } from "@workspace/shared/lib/hooks/neighborhoods.hooks";
import type { Incident, Neighborhood } from "@workspace/shared/lib/types";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { DataState } from "@workspace/ui/components/data-state";
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@workspace/ui/components/empty";
import { PageHeader } from "@workspace/ui/components/page-header";
import {
    Map,
    Marker,
    NeighborhoodPolygon,
} from "@workspace/ui/components/map";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@workspace/ui/components/select";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@workspace/ui/components/table";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@workspace/ui/components/tabs";
import { toast } from "sonner";

type TranslateFn = ReturnType<typeof useTranslation>["t"];

function statusLabel(t: TranslateFn, status: string): string {
    const labels: Record<string, string> = {
        open: t("incidents.status.open"),
        in_progress: t("incidents.status.in_progress"),
        resolved: t("incidents.status.resolved"),
    };
    return labels[status] ?? status;
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
    open: "default",
    in_progress: "secondary",
    resolved: "outline",
};

const NEXT_STATUSES: Record<
    string,
    Array<"open" | "in_progress" | "resolved">
> = {
    open: ["in_progress"],
    in_progress: ["resolved"],
    resolved: [],
};

export const Route = createFileRoute("/_app/incidents/")({
    component: AdminIncidentsPage,
});

function AdminIncidentsPage() {
    const { t } = useTranslation();
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage } =
        useInfiniteIncidents(20, statusFilter);
    const updateStatus = useUpdateIncidentStatus();
    const incidents = data?.pages.flat() ?? [];
    const { data: neighborhoods } = useNeighborhoods();

    return (
        <div className="p-6">
            <div className="mx-auto flex max-w-6xl flex-col gap-6">
                <PageHeader
                    title={t("incidents.title")}
                    description={t("adminPages.incidents.description")}
                    actions={
                        <Select
                            value={statusFilter}
                            onValueChange={setStatusFilter}
                        >
                            <SelectTrigger className="w-44">
                                <SelectValue
                                    placeholder={t(
                                        "adminPages.incidents.allStatuses",
                                    )}
                                />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    {t("adminPages.incidents.filterAll")}
                                </SelectItem>
                                <SelectItem value="open">
                                    {t("adminPages.incidents.filterOpen")}
                                </SelectItem>
                                <SelectItem value="in_progress">
                                    {t("incidents.status.in_progress")}
                                </SelectItem>
                                <SelectItem value="resolved">
                                    {t("adminPages.incidents.filterResolved")}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    }
                />

                <Tabs defaultValue="list" className="gap-4">
                    <TabsList>
                        <TabsTrigger value="list">
                            <HugeiconsIcon icon={ListViewIcon} />
                            {t("adminPages.common.listTab")}
                        </TabsTrigger>
                        <TabsTrigger value="map">
                            <HugeiconsIcon icon={MapsLocation01Icon} />
                            {t("adminPages.common.mapTab")}
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="list">
                        <DataState
                            loading={isLoading}
                            error={isError ? true : undefined}
                            isEmpty={incidents.length === 0}
                            onRetry={() => refetch()}
                            errorTitle={t("adminPages.incidents.loadError")}
                            skeleton={
                                <div className="flex flex-col gap-2">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <Skeleton
                                            key={i}
                                            className="h-12 w-full rounded"
                                        />
                                    ))}
                                </div>
                            }
                            empty={
                                <Empty>
                                    <EmptyHeader>
                                        <EmptyMedia variant="icon">
                                            <HugeiconsIcon icon={Alert01Icon} />
                                        </EmptyMedia>
                                        <EmptyTitle>
                                            {t(
                                                "adminPages.incidents.emptyTitle",
                                            )}
                                        </EmptyTitle>
                                        <EmptyDescription>
                                            {t(
                                                "adminPages.incidents.emptyDescription",
                                            )}
                                        </EmptyDescription>
                                    </EmptyHeader>
                                </Empty>
                            }
                        >
                            <div className="bg-card rounded-lg border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>
                                                {t("incidents.fields.title")}
                                            </TableHead>
                                            <TableHead>
                                                {t("adminPages.incidents.statusColumn")}
                                            </TableHead>
                                            <TableHead>
                                                {t("adminPages.incidents.reportedAt")}
                                            </TableHead>
                                            <TableHead className="text-right">
                                                {t("adminPages.common.action")}
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {incidents.map((incident: Incident) => (
                                            <TableRow key={incident.id}>
                                                <TableCell className="max-w-xs truncate font-medium">
                                                    {incident.title}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={
                                                            STATUS_VARIANTS[
                                                                incident.status
                                                            ] ?? "outline"
                                                        }
                                                    >
                                                        {statusLabel(
                                                            t,
                                                            incident.status,
                                                        )}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-sm tabular-nums">
                                                    {new Date(
                                                        incident.createdAt,
                                                    ).toLocaleDateString(
                                                        "fr-FR",
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {NEXT_STATUSES[
                                                        incident.status
                                                    ]?.length > 0 ? (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            disabled={
                                                                updateStatus.isPending
                                                            }
                                                            onClick={() =>
                                                                updateStatus.mutate(
                                                                    {
                                                                        id: incident.id,
                                                                        status: NEXT_STATUSES[
                                                                            incident
                                                                                .status
                                                                        ][0],
                                                                    },
                                                                    {
                                                                        onSuccess:
                                                                            () =>
                                                                                toast.success(
                                                                                    t(
                                                                                        "adminPages.incidents.statusUpdated",
                                                                                    ),
                                                                                ),
                                                                        onError:
                                                                            () =>
                                                                                toast.error(
                                                                                    t(
                                                                                        "adminPages.incidents.statusUpdateError",
                                                                                    ),
                                                                                ),
                                                                    },
                                                                )
                                                            }
                                                        >
                                                            {updateStatus.isPending
                                                                ? "…"
                                                                : `→ ${statusLabel(t, NEXT_STATUSES[incident.status][0])}`}
                                                        </Button>
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs">
                                                            {t(
                                                                "adminPages.incidents.done",
                                                            )}
                                                        </span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>

                                {hasNextPage && (
                                    <div className="border-t p-4">
                                        <Button
                                            variant="outline"
                                            className="w-full"
                                            onClick={() => fetchNextPage()}
                                        >
                                            {t("adminPages.common.loadMore")}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </DataState>
                    </TabsContent>

                    <TabsContent value="map">
                        <IncidentsMap
                            incidents={incidents}
                            neighborhoods={neighborhoods ?? []}
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

function IncidentsMap({
    incidents,
    neighborhoods,
}: {
    incidents: Incident[];
    neighborhoods: Neighborhood[];
}) {
    const { t } = useTranslation();
    const firstNeighborhood = neighborhoods.find((n) => n.geometry);
    const incidentsWithCoords = incidents.filter(
        (i) => i.lat !== null && i.lng !== null,
    );
    const center: [number, number] = firstNeighborhood?.geometry
        ? centroidOf(firstNeighborhood.geometry)
        : [48.8566, 2.3522];
    return (
        <Map
            center={center}
            zoom={13}
            className="h-[600px] min-h-[60vh] w-full overflow-hidden rounded-lg border"
        >
            {neighborhoods.map((n) =>
                n.geometry ? (
                    <NeighborhoodPolygon
                        key={n._id}
                        geometry={n.geometry}
                        label={n.name}
                    />
                ) : null,
            )}
            {incidentsWithCoords.map((inc) => (
                <Marker
                    key={inc.id}
                    variant="incident"
                    position={[inc.lat!, inc.lng!]}
                    popup={
                        <div className="space-y-1">
                            <p className="font-medium">{inc.title}</p>
                            <p className="text-xs">
                                {t("adminPages.incidents.statusColumn")} :{" "}
                                {statusLabel(t, inc.status)}
                            </p>
                        </div>
                    }
                />
            ))}
        </Map>
    );
}
