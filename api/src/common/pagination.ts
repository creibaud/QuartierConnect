/**
 * Shared helpers for the list endpoints: pagination clamping, safe sort
 * resolution, search-term escaping, and total-count response headers.
 */

export interface Pagination {
    pageNum: number;
    limitNum: number;
    skip: number;
}

const MAX_PAGE_SIZE = 100;

export function parsePagination(page?: string, limit?: string): Pagination {
    const pageNum = Math.max(1, parseInt(page ?? "") || 1);
    const limitNum = Math.min(
        MAX_PAGE_SIZE,
        Math.max(1, parseInt(limit ?? "") || 20),
    );
    return { pageNum, limitNum, skip: (pageNum - 1) * limitNum };
}

export interface ResolvedSort<F extends string> {
    field: F;
    direction: "asc" | "desc";
}

/**
 * Resolves a caller-supplied sort against an allowlist. An unknown field falls
 * back to `fallback` so a crafted `sort` value can never reach the query.
 */
export function resolveSort<F extends string>(
    sort: string | undefined,
    order: string | undefined,
    allowed: readonly F[],
    fallback: F,
): ResolvedSort<F> {
    const field = allowed.includes(sort as F) ? (sort as F) : fallback;
    const direction = order === "asc" ? "asc" : "desc";
    return { field, direction };
}

/** Escapes `%`, `_` and `\` so a search term is matched literally by SQL ILIKE. */
export function escapeLike(term: string): string {
    return term.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** Escapes regex metacharacters so a search term is matched literally by Mongo `$regex`. */
export function escapeRegex(term: string): string {
    return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Sets the `X-Total-Count` / `X-Total-Pages` headers for a paginated list. */
export function setPageHeaders(
    res: { setHeader(key: string, value: string): void },
    total: number,
    limitNum: number,
): void {
    res.setHeader("X-Total-Count", String(total));
    res.setHeader(
        "X-Total-Pages",
        String(Math.max(1, Math.ceil(total / limitNum))),
    );
}
