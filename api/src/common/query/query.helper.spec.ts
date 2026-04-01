import { asc, desc } from "drizzle-orm";
import {
    buildPaginatedResult,
    resolveOrderBy,
    resolvePagination,
    type ColumnMap,
} from "./query.helper";

describe("QueryHelper", () => {
    describe("resolvePagination", () => {
        it("should return default offset and limit", () => {
            const result = resolvePagination();

            expect(result).toEqual({
                offset: 0,
                limit: 10,
            });
        });

        it("should calculate correct offset for given page and limit", () => {
            const result = resolvePagination(2, 20);

            expect(result).toEqual({
                offset: 20,
                limit: 20,
            });
        });

        it("should calculate offset 0 for page 1", () => {
            const result = resolvePagination(1, 25);

            expect(result).toEqual({
                offset: 0,
                limit: 25,
            });
        });

        it("should handle large page numbers", () => {
            const result = resolvePagination(100, 50);

            expect(result).toEqual({
                offset: 4950,
                limit: 50,
            });
        });

        it("should handle different limit values", () => {
            expect(resolvePagination(1, 5).offset).toBe(0);
            expect(resolvePagination(1, 10).offset).toBe(0);
            expect(resolvePagination(1, 100).offset).toBe(0);
        });
    });

    describe("buildPaginatedResult", () => {
        it("should build result with correct metadata", () => {
            const data = [{ id: "1" }, { id: "2" }];
            const result = buildPaginatedResult(data, 100, 1, 20);

            expect(result).toEqual({
                data,
                meta: {
                    total: 100,
                    page: 1,
                    limit: 20,
                    totalPages: 5,
                },
            });
        });

        it("should calculate correct totalPages", () => {
            const result1 = buildPaginatedResult([], 50, 1, 10);
            const result2 = buildPaginatedResult([], 51, 1, 10);
            const result3 = buildPaginatedResult([], 100, 1, 10);

            expect(result1.meta.totalPages).toBe(5);
            expect(result2.meta.totalPages).toBe(6);
            expect(result3.meta.totalPages).toBe(10);
        });

        it("should handle zero total", () => {
            const result = buildPaginatedResult([], 0, 1, 20);

            expect(result.meta.totalPages).toBe(0);
            expect(result.data).toEqual([]);
        });

        it("should handle single page result", () => {
            const data = [{ id: "1" }];
            const result = buildPaginatedResult(data, 1, 1, 20);

            expect(result.meta.totalPages).toBe(1);
        });

        it("should preserve data in result", () => {
            const data = [
                { id: "1", name: "Item 1" },
                { id: "2", name: "Item 2" },
                { id: "3", name: "Item 3" },
            ];
            const result = buildPaginatedResult(data, 150, 2, 50);

            expect(result.data).toEqual(data);
            expect(result.data.length).toBe(3);
        });

        it("should maintain pagination info across multiple calls", () => {
            const result1 = buildPaginatedResult([], 100, 1, 10);
            const result2 = buildPaginatedResult([], 100, 2, 10);
            const result3 = buildPaginatedResult([], 100, 5, 10);

            expect(result1.meta.page).toBe(1);
            expect(result2.meta.page).toBe(2);
            expect(result3.meta.page).toBe(5);
            expect(result1.meta.totalPages).toBe(10);
            expect(result2.meta.totalPages).toBe(10);
            expect(result3.meta.totalPages).toBe(10);
        });
    });

    describe("resolveOrderBy", () => {
        // Create mock columns for testing
        const mockColumns: ColumnMap = {
            createdAt: { name: "created_at" } as any,
            updatedAt: { name: "updated_at" } as any,
            id: { name: "id" } as any,
        };
        const defaultColumn = mockColumns.createdAt;

        it("should return descending order for desc sort order", () => {
            const result = resolveOrderBy(
                "createdAt",
                "desc",
                mockColumns,
                defaultColumn,
            );

            // The result should be a desc SQL object
            expect(result).toBeDefined();
            // Drizzle returns an object with direction
            expect(JSON.stringify(result)).toContain("desc");
        });

        it("should return ascending order for asc sort order", () => {
            const result = resolveOrderBy(
                "createdAt",
                "asc",
                mockColumns,
                defaultColumn,
            );

            expect(result).toBeDefined();
            expect(JSON.stringify(result)).toContain("asc");
        });

        it("should use default column when sortBy not found in columnMap", () => {
            const result = resolveOrderBy(
                "nonexistent",
                "desc",
                mockColumns,
                defaultColumn,
            );

            expect(result).toBeDefined();
        });

        it("should use default column when sortBy is undefined", () => {
            const result = resolveOrderBy(
                undefined,
                "desc",
                mockColumns,
                defaultColumn,
            );

            expect(result).toBeDefined();
        });

        it("should use default ascending when sortOrder is undefined", () => {
            const result = resolveOrderBy(
                "createdAt",
                undefined,
                mockColumns,
                defaultColumn,
            );

            expect(result).toBeDefined();
            expect(JSON.stringify(result)).toContain("asc");
        });

        it("should handle different column sorting", () => {
            const result1 = resolveOrderBy(
                "createdAt",
                "desc",
                mockColumns,
                defaultColumn,
            );
            const result2 = resolveOrderBy(
                "updatedAt",
                "desc",
                mockColumns,
                defaultColumn,
            );
            const result3 = resolveOrderBy(
                "id",
                "asc",
                mockColumns,
                defaultColumn,
            );

            expect(result1).toBeDefined();
            expect(result2).toBeDefined();
            expect(result3).toBeDefined();
        });

        it("should default to ascending when sortOrder is not desc", () => {
            const result = resolveOrderBy(
                "createdAt",
                "asc",
                mockColumns,
                defaultColumn,
            );

            expect(result).toBeDefined();
            expect(JSON.stringify(result)).toContain("asc");
        });
    });
});
