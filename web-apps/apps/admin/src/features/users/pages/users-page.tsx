import { useState } from "react";
import { useTranslation } from "react-i18next";
import { UserMultipleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQueryClient } from "@tanstack/react-query";
import { getCurrentUser } from "@workspace/shared/lib/auth";
import { useAdminUsers } from "@workspace/shared/lib/hooks/admin-lists.hooks";
import { useUpdateUserRole } from "@workspace/shared/lib/hooks/useAdminUsers";
import { useDebouncedValue } from "@workspace/shared/lib/hooks/useDebouncedValue";
import type { User } from "@workspace/shared/lib/types";
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
import { toast } from "sonner";
import { UsersFilters } from "../components/users-filters";
import { UsersTable } from "../components/users-table";

const PAGE_SIZE = 20;

export function UsersPage() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [page, setPage] = useState(1);
    const [sort, setSort] = useState("createdAt");
    const [order, setOrder] = useState<"asc" | "desc">("desc");

    const debouncedSearch = useDebouncedValue(search.trim(), 300);
    const { rows, totalPages, isLoading, error } = useAdminUsers({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch,
        sort,
        order,
        role: roleFilter,
    });
    const updateRole = useUpdateUserRole();
    const currentUserId = getCurrentUser()?.sub ?? null;

    function handleSearchChange(value: string) {
        setSearch(value);
        setPage(1);
    }

    function handleRoleFilterChange(value: string) {
        setRoleFilter(value);
        setPage(1);
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

    function refreshList() {
        queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    }

    function handleRoleChange(userId: string, role: User["role"]) {
        updateRole.mutate(
            { id: userId, role },
            {
                onSuccess: () => {
                    refreshList();
                    toast.success(t("adminPages.users.roleUpdated"));
                },
                onError: () =>
                    toast.error(t("adminPages.users.roleUpdateError")),
            },
        );
    }

    function handleBanToggle(user: User) {
        const isBanning = user.role !== "banned";
        updateRole.mutate(
            { id: user.id, role: isBanning ? "banned" : "resident" },
            {
                onSuccess: () => {
                    refreshList();
                    toast.success(
                        isBanning
                            ? t("adminPages.users.userBanned")
                            : t("adminPages.users.userReactivated"),
                    );
                },
                onError: () =>
                    toast.error(t("adminPages.users.roleUpdateError")),
            },
        );
    }

    return (
        <div className="p-6 md:p-8">
            <div className="mx-auto flex max-w-7xl flex-col gap-6">
                <PageHeader
                    title={t("adminPages.users.title")}
                    description={t("adminPages.users.description")}
                />

                <UsersFilters
                    search={search}
                    onSearchChange={handleSearchChange}
                    roleFilter={roleFilter}
                    onRoleFilterChange={handleRoleFilterChange}
                />

                <DataState
                    loading={isLoading}
                    error={error ? true : undefined}
                    isEmpty={rows.length === 0}
                    skeleton={
                        <div className="flex flex-col gap-2">
                            {Array.from({ length: 6 }).map((_, i) => (
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
                                    <HugeiconsIcon icon={UserMultipleIcon} />
                                </EmptyMedia>
                                <EmptyTitle>
                                    {t("adminPages.users.emptyTitle")}
                                </EmptyTitle>
                                <EmptyDescription>
                                    {t("adminPages.users.emptyDescription")}
                                </EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    }
                >
                    <div className="space-y-4">
                        <UsersTable
                            users={rows}
                            sort={sort}
                            order={order}
                            onSort={handleSort}
                            currentUserId={currentUserId}
                            updatePending={updateRole.isPending}
                            onRoleChange={handleRoleChange}
                            onBanToggle={handleBanToggle}
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
            </div>
        </div>
    );
}
