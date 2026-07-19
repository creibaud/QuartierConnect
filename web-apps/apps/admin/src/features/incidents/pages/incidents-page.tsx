import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Alert01Icon,
    ListViewIcon,
    MapsLocation01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQueryClient } from "@tanstack/react-query";
import {
    useAdminIncidents,
    useAdminIncidentsForMap,
} from "@workspace/shared/lib/hooks/admin-lists.hooks";
import {
    useDeleteIncident,
    useUpdateIncidentStatus,
} from "@workspace/shared/lib/hooks/incidents.hooks";
import { useNeighborhoods } from "@workspace/shared/lib/hooks/neighborhoods.hooks";
import type { Incident } from "@workspace/shared/lib/types";
import { DataState } from "@workspace/ui/components/data-state";
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@workspace/ui/components/empty";
import { PageHeader } from "@workspace/ui/components/page-header";
import { DataPagination } from "@workspace/ui/components/pagination";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@workspace/ui/components/tabs";
import { toast } from "sonner";
import { IncidentsFilters } from "../components/incidents-filters";
import { IncidentsMap } from "../components/incidents-map";
import { IncidentsTable } from "../components/incidents-table";

const PAGE_SIZE = 20;

export function AdminIncidentsPage() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [statusFilter, setStatusFilter] = useState("all");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [page, setPage] = useState(1);
    const [sort, setSort] = useState("createdAt");
    const [order, setOrder] = useState<"asc" | "desc">("desc");

    const { rows, totalPages, isLoading, error } = useAdminIncidents({
        page,
        limit: PAGE_SIZE,
        status: statusFilter,
        category: categoryFilter,
        sort,
        order,
    });
    const { rows: mapIncidents } = useAdminIncidentsForMap({
        status: statusFilter,
        category: categoryFilter,
    });
    const { data: neighborhoods } = useNeighborhoods();

    const updateStatus = useUpdateIncidentStatus();
    const deleteIncident = useDeleteIncident();

    function handleCategoryChange(value: string) {
        setCategoryFilter(value);
        setPage(1);
    }

    function handleStatusChange(value: string) {
        setStatusFilter(value);
        setPage(1);
    }

    function refreshList() {
        queryClient.invalidateQueries({ queryKey: ["admin-incidents"] });
    }

    function handleSort(field: string) {
        setPage(1);
        if (sort === field) {
            setOrder((current) => (current === "asc" ? "desc" : "asc"));
        } else {
            setSort(field);
            setOrder("asc");
        }
    }

    function handleAdvance(
        id: string,
        status: "open" | "in_progress" | "resolved",
    ) {
        updateStatus.mutate(
            { id, status },
            {
                onSuccess: () => {
                    refreshList();
                    toast.success(t("adminPages.incidents.statusUpdated"));
                },
                onError: () =>
                    toast.error(t("adminPages.incidents.statusUpdateError")),
            },
        );
    }

    function handleDelete(incident: Incident) {
        deleteIncident.mutate(incident.id, {
            onSuccess: () => {
                refreshList();
                toast.success(t("adminPages.incidents.deleted"));
            },
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
                        <IncidentsFilters
                            categoryFilter={categoryFilter}
                            onCategoryChange={handleCategoryChange}
                            statusFilter={statusFilter}
                            onStatusChange={handleStatusChange}
                        />
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
                            error={error ? true : undefined}
                            isEmpty={rows.length === 0}
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
                            <div className="space-y-4">
                                <IncidentsTable
                                    incidents={rows}
                                    sort={sort}
                                    order={order}
                                    onSort={handleSort}
                                    updatePending={updateStatus.isPending}
                                    deletePending={deleteIncident.isPending}
                                    onAdvance={handleAdvance}
                                    onDelete={handleDelete}
                                />
                                <DataPagination
                                    page={page}
                                    pageCount={totalPages}
                                    onPageChange={setPage}
                                    previousLabel={t(
                                        "adminPages.common.previousPage",
                                    )}
                                    nextLabel={t("adminPages.common.nextPage")}
                                />
                            </div>
                        </DataState>
                    </TabsContent>

                    <TabsContent value="map">
                        <IncidentsMap
                            incidents={mapIncidents}
                            neighborhoods={neighborhoods ?? []}
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
