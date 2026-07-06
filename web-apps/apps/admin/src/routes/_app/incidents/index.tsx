import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Alert01Icon,
    ArrowRight01Icon,
    Delete01Icon,
    ListViewIcon,
    MapsLocation01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute } from "@tanstack/react-router";
import { centroidOf } from "@workspace/shared/lib/geo";
import {
    useDeleteIncident,
    useInfiniteIncidents,
    useUpdateIncidentStatus,
} from "@workspace/shared/lib/hooks/incidents.hooks";
import { useNeighborhoods } from "@workspace/shared/lib/hooks/neighborhoods.hooks";
import type { Incident, Neighborhood } from "@workspace/shared/lib/types";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog";
import { Button } from "@workspace/ui/components/button";
import { DataState } from "@workspace/ui/components/data-state";
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@workspace/ui/components/empty";
import { Map, Marker, NeighborhoodPolygon } from "@workspace/ui/components/map";
import { PageHeader } from "@workspace/ui/components/page-header";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@workspace/ui/components/select";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { SortableHead } from "@workspace/ui/components/sortable-head";
import { Spinner } from "@workspace/ui/components/spinner";
import { StatusBadge, statusTone } from "@workspace/ui/components/status-badge";
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
import { useTableSort } from "@workspace/ui/hooks/use-table-sort";
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
    const { t, i18n } = useTranslation();
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [categoryFilter, setCategoryFilter] = useState<string>("all");
    const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage } =
        useInfiniteIncidents(20, statusFilter);
    const updateStatus = useUpdateIncidentStatus();
    const deleteIncident = useDeleteIncident();
    const incidents = (data?.pages.flat() ?? []).filter(
        (incident) =>
            categoryFilter === "all" || incident.category === categoryFilter,
    );
    const { data: neighborhoods } = useNeighborhoods();
    const categoryKey = (category: string) =>
        `pages.incidents.categories.${category}`;
    const { sorted, toggle, getSortDirection } = useTableSort(incidents, {
        accessors: {
            status: (incident) => statusLabel(t, incident.status),
            category: (incident) => t(categoryKey(incident.category)),
            reportedAt: (incident) => new Date(incident.createdAt),
        },
    });

    function handleDelete(incident: Incident) {
        deleteIncident.mutate(incident.id, {
            onSuccess: () => toast.success(t("adminPages.incidents.deleted")),
            onError: () => toast.error(t("adminPages.incidents.deleteError")),
        });
    }

    return (
        <div className="p-6 md:p-8">
            <div className="mx-auto flex max-w-7xl flex-col gap-6">
                <PageHeader
                    title={t("incidents.title")}
                    description={t("adminPages.incidents.description")}
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            <Select
                                value={categoryFilter}
                                onValueChange={setCategoryFilter}
                            >
                                <SelectTrigger
                                    className="w-52"
                                    aria-label={t(
                                        "adminPages.incidents.categoryColumn",
                                    )}
                                >
                                    <SelectValue
                                        placeholder={t(
                                            "adminPages.incidents.allCategories",
                                        )}
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        {t(
                                            "adminPages.incidents.allCategories",
                                        )}
                                    </SelectItem>
                                    <SelectItem value="neighborhood">
                                        {t(categoryKey("neighborhood"))}
                                    </SelectItem>
                                    <SelectItem value="reporting">
                                        {t(categoryKey("reporting"))}
                                    </SelectItem>
                                    <SelectItem value="bug">
                                        {t(categoryKey("bug"))}
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <Select
                                value={statusFilter}
                                onValueChange={setStatusFilter}
                            >
                                <SelectTrigger
                                    className="w-44"
                                    aria-label={t(
                                        "adminPages.incidents.statusColumn",
                                    )}
                                >
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
                                        {t(
                                            "adminPages.incidents.filterResolved",
                                        )}
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
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
                                            <SortableHead
                                                direction={getSortDirection(
                                                    "title",
                                                )}
                                                onSort={() => toggle("title")}
                                            >
                                                {t("incidents.fields.title")}
                                            </SortableHead>
                                            <SortableHead
                                                direction={getSortDirection(
                                                    "status",
                                                )}
                                                onSort={() => toggle("status")}
                                            >
                                                {t(
                                                    "adminPages.incidents.statusColumn",
                                                )}
                                            </SortableHead>
                                            <SortableHead
                                                direction={getSortDirection(
                                                    "category",
                                                )}
                                                onSort={() =>
                                                    toggle("category")
                                                }
                                            >
                                                {t(
                                                    "adminPages.incidents.categoryColumn",
                                                )}
                                            </SortableHead>
                                            <SortableHead
                                                direction={getSortDirection(
                                                    "reportedAt",
                                                )}
                                                onSort={() =>
                                                    toggle("reportedAt")
                                                }
                                            >
                                                {t(
                                                    "adminPages.incidents.reportedAt",
                                                )}
                                            </SortableHead>
                                            <TableHead className="text-right">
                                                {t("adminPages.common.action")}
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sorted.map((incident) => (
                                            <TableRow key={incident.id}>
                                                <TableCell className="max-w-xs truncate py-2 font-medium">
                                                    {incident.title}
                                                </TableCell>
                                                <TableCell className="py-2">
                                                    <StatusBadge
                                                        tone={statusTone(
                                                            incident.status,
                                                        )}
                                                    >
                                                        {statusLabel(
                                                            t,
                                                            incident.status,
                                                        )}
                                                    </StatusBadge>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground py-2 text-sm">
                                                    {t(
                                                        categoryKey(
                                                            incident.category,
                                                        ),
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground py-2 text-sm tabular-nums">
                                                    {new Date(
                                                        incident.createdAt,
                                                    ).toLocaleDateString(
                                                        i18n.language,
                                                    )}
                                                </TableCell>
                                                <TableCell className="py-2 text-right">
                                                    <div className="flex items-center justify-end gap-2">
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
                                                                {updateStatus.isPending ? (
                                                                    <Spinner className="mr-2" />
                                                                ) : (
                                                                    <HugeiconsIcon
                                                                        icon={
                                                                            ArrowRight01Icon
                                                                        }
                                                                        className="mr-1.5 size-3.5"
                                                                    />
                                                                )}
                                                                {statusLabel(
                                                                    t,
                                                                    NEXT_STATUSES[
                                                                        incident
                                                                            .status
                                                                    ][0],
                                                                )}
                                                            </Button>
                                                        ) : (
                                                            <span className="text-muted-foreground text-xs">
                                                                {t(
                                                                    "adminPages.incidents.done",
                                                                )}
                                                            </span>
                                                        )}
                                                        <AlertDialog>
                                                            <AlertDialogTrigger
                                                                asChild
                                                            >
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="text-destructive hover:text-destructive h-8 text-xs"
                                                                    disabled={
                                                                        deleteIncident.isPending
                                                                    }
                                                                >
                                                                    <HugeiconsIcon
                                                                        icon={
                                                                            Delete01Icon
                                                                        }
                                                                    />
                                                                    {t(
                                                                        "common.delete",
                                                                    )}
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>
                                                                        {t(
                                                                            "adminPages.incidents.deleteConfirmTitle",
                                                                        )}
                                                                    </AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        {t(
                                                                            "adminPages.incidents.deleteConfirmDescription",
                                                                            {
                                                                                title: incident.title,
                                                                            },
                                                                        )}
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>
                                                                        {t(
                                                                            "common.cancel",
                                                                        )}
                                                                    </AlertDialogCancel>
                                                                    <AlertDialogAction
                                                                        variant="destructive"
                                                                        onClick={() =>
                                                                            handleDelete(
                                                                                incident,
                                                                            )
                                                                        }
                                                                    >
                                                                        {t(
                                                                            "common.delete",
                                                                        )}
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </div>
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
