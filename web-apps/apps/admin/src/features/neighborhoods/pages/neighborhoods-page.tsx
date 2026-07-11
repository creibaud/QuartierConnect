import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Add01Icon, Building01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQueryClient } from "@tanstack/react-query";
import { useAdminNeighborhoods } from "@workspace/shared/lib/hooks/admin-lists.hooks";
import {
    useDeleteNeighborhood,
    useNeighborhoods,
} from "@workspace/shared/lib/hooks/neighborhoods.hooks";
import { useDebouncedValue } from "@workspace/shared/lib/hooks/useDebouncedValue";
import type { Neighborhood } from "@workspace/shared/lib/types";
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
import { NeighborhoodFormDialog } from "../components/neighborhood-form-dialog";
import { NeighborhoodsSearch } from "../components/neighborhoods-search";
import { NeighborhoodsTable } from "../components/neighborhoods-table";

const PAGE_SIZE = 10;

export function NeighborhoodsPage() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [createOpen, setCreateOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Neighborhood | null>(null);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [sort, setSort] = useState("name");
    const [order, setOrder] = useState<"asc" | "desc">("asc");

    const debouncedSearch = useDebouncedValue(search.trim(), 300);
    const { rows, totalPages, isLoading, error } = useAdminNeighborhoods({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch,
        sort,
        order,
    });
    // The dialog needs the full set to draw sibling polygons and detect overlap.
    const { data: allNeighborhoods } = useNeighborhoods();
    const others = allNeighborhoods ?? [];
    const deleteNeighborhood = useDeleteNeighborhood();

    useEffect(() => {
        setPage(1);
    }, [debouncedSearch]);

    function refreshList() {
        queryClient.invalidateQueries({ queryKey: ["admin-neighborhoods"] });
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
        deleteNeighborhood.mutate(id, {
            onSuccess: () => {
                refreshList();
                toast.success(t("adminPages.neighborhoods.deleted"));
            },
            onError: () => toast.error(t("adminPages.common.deleteError")),
        });
    }

    return (
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6 md:p-8">
            <PageHeader
                title={t("adminPages.neighborhoods.title")}
                description={t("adminPages.neighborhoods.description")}
                actions={
                    <Button onClick={() => setCreateOpen(true)}>
                        <HugeiconsIcon icon={Add01Icon} />
                        {t("adminPages.common.create")}
                    </Button>
                }
            />

            <NeighborhoodsSearch value={search} onChange={setSearch} />

            <DataState
                loading={isLoading}
                error={error ? true : undefined}
                isEmpty={rows.length === 0}
                errorTitle={t("adminPages.neighborhoods.loadError")}
                skeleton={
                    <div className="flex flex-col gap-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full rounded" />
                        ))}
                    </div>
                }
                empty={
                    <Empty>
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <HugeiconsIcon icon={Building01Icon} />
                            </EmptyMedia>
                            <EmptyTitle>
                                {t("adminPages.neighborhoods.emptyTitle")}
                            </EmptyTitle>
                            <EmptyDescription>
                                {t("adminPages.neighborhoods.emptyDescription")}
                            </EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent>
                            <Button onClick={() => setCreateOpen(true)}>
                                <HugeiconsIcon icon={Add01Icon} />
                                {t("adminPages.neighborhoods.createCta")}
                            </Button>
                        </EmptyContent>
                    </Empty>
                }
            >
                <div className="space-y-4">
                    <NeighborhoodsTable
                        neighborhoods={rows as Neighborhood[]}
                        sort={sort}
                        order={order}
                        onSort={handleSort}
                        deletePending={deleteNeighborhood.isPending}
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

            <NeighborhoodFormDialog
                open={createOpen}
                others={others}
                onOpenChange={setCreateOpen}
                onSuccess={() => {
                    refreshList();
                    setCreateOpen(false);
                }}
            />

            {editTarget && (
                <NeighborhoodFormDialog
                    key={editTarget._id}
                    open
                    initial={editTarget}
                    others={others.filter((n) => n._id !== editTarget._id)}
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
    );
}
