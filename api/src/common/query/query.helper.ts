import { asc, desc, SQL } from "drizzle-orm";
import { AnyPgColumn } from "drizzle-orm/pg-core";

export interface PaginatedResult<T> {
    data: T[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export type ColumnMap = Record<string, AnyPgColumn | SQL>;

export function resolveOrderBy(
    sortBy: string | undefined,
    sortOrder: "asc" | "desc" | undefined,
    columnMap: ColumnMap,
    defaultColumn: AnyPgColumn | SQL,
): SQL {
    const column = (sortBy ? columnMap[sortBy] : undefined) ?? defaultColumn;
    return sortOrder === "desc" ? desc(column) : asc(column);
}

export function resolvePagination(page = 1, limit = 10) {
    return { limit, offset: (page - 1) * limit };
}

export function buildPaginatedResult<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
): PaginatedResult<T> {
    return {
        data,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
}
