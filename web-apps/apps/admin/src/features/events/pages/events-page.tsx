import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Add01Icon, Calendar01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQueryClient } from "@tanstack/react-query";
import { useAdminEvents } from "@workspace/shared/lib/hooks/admin-lists.hooks";
import { useDeleteEvent } from "@workspace/shared/lib/hooks/events.hooks";
import { useNeighborhoods } from "@workspace/shared/lib/hooks/neighborhoods.hooks";
import { useDebouncedValue } from "@workspace/shared/lib/hooks/useDebouncedValue";
import type { Event } from "@workspace/shared/lib/types";
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
import { toast } from "sonner";
import { EventFormDialog } from "../components/event-form-dialog";
import { EventsSearch } from "../components/events-search";
import { EventsTable } from "../components/events-table";

const PAGE_SIZE = 10;

export function AdminEventsPage() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [createOpen, setCreateOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Event | null>(null);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [sort, setSort] = useState("date");
    const [order, setOrder] = useState<"asc" | "desc">("desc");

    const debouncedSearch = useDebouncedValue(search.trim(), 300);
    const { rows, totalPages, isLoading, error } = useAdminEvents({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch,
        sort,
        order,
    });
    const { data: neighborhoodsData } = useNeighborhoods(100);
    const neighborhoods = neighborhoodsData ?? [];
    const deleteEvent = useDeleteEvent();

    const neighborhoodNames = Object.fromEntries(
        neighborhoods.map((n) => [n._id, n.name]),
    );

    function handleSearchChange(value: string) {
        setSearch(value);
        setPage(1);
    }

    function refreshList() {
        queryClient.invalidateQueries({ queryKey: ["admin-events"] });
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
        deleteEvent.mutate(id, {
            onSuccess: () => {
                refreshList();
                toast.success(t("adminPages.events.deleted"));
            },
            onError: () => toast.error(t("adminPages.common.deleteError")),
        });
    }

    return (
        <div className="p-6 md:p-8">
            <div className="mx-auto flex max-w-7xl flex-col gap-6">
                <PageHeader
                    title={t("adminPages.events.title")}
                    description={t("adminPages.events.description")}
                    actions={
                        <Button onClick={() => setCreateOpen(true)}>
                            <HugeiconsIcon icon={Add01Icon} />
                            {t("adminPages.common.create")}
                        </Button>
                    }
                />

                <EventsSearch value={search} onChange={handleSearchChange} />

                <DataState
                    loading={isLoading}
                    error={error ? true : undefined}
                    isEmpty={rows.length === 0}
                    errorTitle={t("adminPages.events.loadError")}
                    skeleton={
                        <div className="flex flex-col gap-2">
                            {Array.from({ length: 4 }).map((_, i) => (
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
                                    <HugeiconsIcon icon={Calendar01Icon} />
                                </EmptyMedia>
                                <EmptyTitle>
                                    {t("adminPages.events.emptyTitle")}
                                </EmptyTitle>
                                <EmptyDescription>
                                    {t("adminPages.events.emptyDescription")}
                                </EmptyDescription>
                            </EmptyHeader>
                            <EmptyContent>
                                <Button onClick={() => setCreateOpen(true)}>
                                    <HugeiconsIcon icon={Add01Icon} />
                                    {t("adminPages.common.create")}
                                </Button>
                            </EmptyContent>
                        </Empty>
                    }
                >
                    <div className="space-y-4">
                        <EventsTable
                            events={rows}
                            neighborhoodNames={neighborhoodNames}
                            sort={sort}
                            order={order}
                            onSort={handleSort}
                            deletePending={deleteEvent.isPending}
                            onEdit={setEditTarget}
                            onDelete={handleDelete}
                        />
                        <DataPagination
                            page={page}
                            pageCount={totalPages}
                            onPageChange={setPage}
                            previousLabel={t("adminPages.common.previousPage")}
                            nextLabel={t("adminPages.common.nextPage")}
                        />
                    </div>
                </DataState>

                <EventFormDialog
                    open={createOpen}
                    neighborhoods={neighborhoods}
                    onOpenChange={setCreateOpen}
                    onSuccess={() => {
                        refreshList();
                        setCreateOpen(false);
                    }}
                />

                {editTarget && (
                    <EventFormDialog
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
