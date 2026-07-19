import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Add01Icon, CustomerServiceIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQueryClient } from "@tanstack/react-query";
import {
    useAdminServices,
    useAdminServicesForMap,
} from "@workspace/shared/lib/hooks/admin-lists.hooks";
import { useNeighborhoods } from "@workspace/shared/lib/hooks/neighborhoods.hooks";
import { useDeleteService } from "@workspace/shared/lib/hooks/services.hooks";
import { useDebouncedValue } from "@workspace/shared/lib/hooks/useDebouncedValue";
import type { Service } from "@workspace/shared/lib/types";
import { Button } from "@workspace/ui/components/button";
import { DataState } from "@workspace/ui/components/data-state";
import {
    Empty,
    EmptyContent,
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
import { ServiceFormDialog } from "../components/service-form-dialog";
import { ServicesFilters } from "../components/services-filters";
import { ServicesMap } from "../components/services-map";
import { ServicesTable } from "../components/services-table";

const PAGE_SIZE = 10;

export function AdminServicesPage() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [createOpen, setCreateOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Service | null>(null);
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [sort, setSort] = useState("title");
    const [order, setOrder] = useState<"asc" | "desc">("asc");

    const debouncedSearch = useDebouncedValue(search.trim(), 300);
    const { rows, totalPages, isLoading, error } = useAdminServices({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch,
        category: categoryFilter,
        sort,
        order,
    });
    const { rows: mapServices } = useAdminServicesForMap({
        search: debouncedSearch,
        category: categoryFilter,
    });
    const { data: neighborhoodsData } = useNeighborhoods(100);
    const neighborhoods = neighborhoodsData ?? [];
    const deleteService = useDeleteService();

    const neighborhoodNames = Object.fromEntries(
        neighborhoods.map((n) => [n._id, n.name]),
    );

    function handleSearchChange(value: string) {
        setSearch(value);
        setPage(1);
    }

    function handleCategoryChange(value: string) {
        setCategoryFilter(value);
        setPage(1);
    }

    function refreshList() {
        queryClient.invalidateQueries({ queryKey: ["admin-services"] });
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

    function handleDelete(id: string) {
        deleteService.mutate(id, {
            onSuccess: () => {
                refreshList();
                toast.success(t("adminPages.services.deleted"));
            },
            onError: () => toast.error(t("adminPages.common.deleteError")),
        });
    }

    return (
        <div className="p-6 md:p-8">
            <div className="mx-auto flex max-w-7xl flex-col gap-6">
                <PageHeader
                    title={t("adminPages.services.title")}
                    description={t("adminPages.services.description")}
                    actions={
                        <Button onClick={() => setCreateOpen(true)}>
                            <HugeiconsIcon icon={Add01Icon} />
                            {t("adminPages.common.add")}
                        </Button>
                    }
                />

                <Tabs defaultValue="list" className="gap-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <TabsList>
                            <TabsTrigger value="list">
                                {t("adminPages.common.listTab")}
                            </TabsTrigger>
                            <TabsTrigger value="map">
                                {t("adminPages.common.mapTab")}
                            </TabsTrigger>
                        </TabsList>
                        <ServicesFilters
                            search={search}
                            onSearchChange={handleSearchChange}
                            categoryFilter={categoryFilter}
                            onCategoryChange={handleCategoryChange}
                        />
                    </div>
                    <TabsContent value="list">
                        <DataState
                            loading={isLoading}
                            error={error ? true : undefined}
                            isEmpty={rows.length === 0}
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
                                            <HugeiconsIcon
                                                icon={CustomerServiceIcon}
                                            />
                                        </EmptyMedia>
                                        <EmptyTitle>
                                            {t(
                                                "adminPages.services.emptyTitle",
                                            )}
                                        </EmptyTitle>
                                        <EmptyDescription>
                                            {t(
                                                "adminPages.services.emptyDescription",
                                            )}
                                        </EmptyDescription>
                                    </EmptyHeader>
                                    <EmptyContent>
                                        <Button
                                            onClick={() => setCreateOpen(true)}
                                        >
                                            <HugeiconsIcon icon={Add01Icon} />
                                            {t("adminPages.services.addCta")}
                                        </Button>
                                    </EmptyContent>
                                </Empty>
                            }
                        >
                            <div className="space-y-4">
                                <ServicesTable
                                    services={rows}
                                    neighborhoodNames={neighborhoodNames}
                                    sort={sort}
                                    order={order}
                                    onSort={handleSort}
                                    deletePending={deleteService.isPending}
                                    onEdit={setEditTarget}
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
                        <ServicesMap
                            services={mapServices}
                            neighborhoods={neighborhoods}
                        />
                    </TabsContent>
                </Tabs>

                <ServiceFormDialog
                    open={createOpen}
                    neighborhoods={neighborhoods}
                    onOpenChange={setCreateOpen}
                    onSuccess={() => {
                        refreshList();
                        setCreateOpen(false);
                    }}
                />

                {editTarget && (
                    <ServiceFormDialog
                        key={editTarget._id}
                        open
                        initial={editTarget}
                        neighborhoods={neighborhoods}
                        onOpenChange={(open) => {
                            if (!open) setEditTarget(null);
                        }}
                        onSuccess={() => {
                            refreshList();
                            setEditTarget(null);
                        }}
                    />
                )}
            </div>
        </div>
    );
}
