import * as React from "react";

type SortDirection = "asc" | "desc";

type SortState = {
    key: string;
    direction: SortDirection;
};

type SortValue = string | number | boolean | Date | null | undefined;

type SortAccessor<T> = (row: T) => SortValue;

type UseTableSortOptions<T> = {
    initial?: SortState;
    accessors?: Record<string, SortAccessor<T>>;
};

function compareValues(a: SortValue, b: SortValue): number {
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;
    if (a instanceof Date && b instanceof Date) {
        return a.getTime() - b.getTime();
    }
    if (typeof a === "number" && typeof b === "number") {
        return a - b;
    }
    if (typeof a === "boolean" && typeof b === "boolean") {
        return Number(a) - Number(b);
    }
    return String(a).localeCompare(String(b), undefined, {
        numeric: true,
        sensitivity: "base",
    });
}

function useTableSort<T>(rows: T[], options: UseTableSortOptions<T> = {}) {
    const { initial, accessors } = options;
    const [sort, setSort] = React.useState<SortState | null>(initial ?? null);

    const toggle = React.useCallback((key: string) => {
        setSort((current) => {
            if (current?.key !== key) {
                return { key, direction: "asc" };
            }
            return {
                key,
                direction: current.direction === "asc" ? "desc" : "asc",
            };
        });
    }, []);

    const sorted = React.useMemo(() => {
        if (!sort) return rows;
        const readValue =
            accessors?.[sort.key] ??
            ((row: T) =>
                (row as Record<string, unknown>)[sort.key] as SortValue);
        const factor = sort.direction === "asc" ? 1 : -1;
        return [...rows].sort(
            (a, b) => compareValues(readValue(a), readValue(b)) * factor,
        );
    }, [rows, sort, accessors]);

    const getSortDirection = React.useCallback(
        (key: string): SortDirection | null =>
            sort?.key === key ? sort.direction : null,
        [sort],
    );

    return { sorted, sort, toggle, getSortDirection };
}

export { useTableSort };
export type { SortDirection, SortState };
