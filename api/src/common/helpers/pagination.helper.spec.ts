import { BadRequestException } from "@nestjs/common";
import { PaginationHelper } from "./pagination.helper";

describe("PaginationHelper", () => {
    describe("resolvePagination", () => {
        it("should return default values when no query provided", () => {
            const result = PaginationHelper.resolvePagination();

            expect(result).toEqual({
                page: 1,
                limit: 20,
                offset: 0,
                sortBy: "createdAt",
                sortOrder: "desc",
            });
        });

        it("should parse valid page and limit from query", () => {
            const result = PaginationHelper.resolvePagination({
                page: 2,
                limit: 10,
            });

            expect(result).toEqual({
                page: 2,
                limit: 10,
                offset: 10,
                sortBy: "createdAt",
                sortOrder: "desc",
            });
        });

        it("should respect MAX_LIMIT boundary (100)", () => {
            const result = PaginationHelper.resolvePagination({
                page: 1,
                limit: 500,
            });

            expect(result.limit).toBe(100);
        });

        it("should use DEFAULT_LIMIT when limit is 0 or falsy", () => {
            const result = PaginationHelper.resolvePagination({
                page: 1,
                limit: 0,
            });

            // 0 is falsy, so it uses DEFAULT_LIMIT (20)
            expect(result.limit).toBe(20);
        });

        it("should clamp page to minimum 1", () => {
            const result = PaginationHelper.resolvePagination({
                page: -5,
                limit: 20,
            });

            expect(result.page).toBe(1);
            expect(result.offset).toBe(0);
        });

        it("should include sorting parameters from query", () => {
            const result = PaginationHelper.resolvePagination({
                page: 1,
                limit: 20,
                sortBy: "updatedAt",
                sortOrder: "asc",
            });

            expect(result.sortBy).toBe("updatedAt");
            expect(result.sortOrder).toBe("asc");
        });

        it("should handle string values by coercing to numbers", () => {
            const result = PaginationHelper.resolvePagination({
                page: "3" as any,
                limit: "25" as any,
            });

            expect(result.page).toBe(3);
            expect(result.limit).toBe(25);
            expect(result.offset).toBe(50);
        });

        it("should throw BadRequestException for non-integer page", () => {
            expect(() => {
                PaginationHelper.resolvePagination({
                    page: 1.5,
                    limit: 20,
                });
            }).toThrow(BadRequestException);
        });

        it("should throw BadRequestException for non-integer limit", () => {
            expect(() => {
                PaginationHelper.resolvePagination({
                    page: 1,
                    limit: 20.7,
                });
            }).toThrow(BadRequestException);
        });

        it("should calculate correct offset for page 5 with limit 25", () => {
            const result = PaginationHelper.resolvePagination({
                page: 5,
                limit: 25,
            });

            expect(result.offset).toBe(100); // (5-1) * 25
        });
    });

    describe("buildPaginatedResponse", () => {
        it("should build response with correct metadata", () => {
            const data = [{ id: "1" }, { id: "2" }];
            const result = PaginationHelper.buildPaginatedResponse(
                data,
                50,
                1,
                20,
            );

            expect(result).toEqual({
                data,
                meta: {
                    total: 50,
                    page: 1,
                    limit: 20,
                    pages: 3,
                    hasNextPage: true,
                    hasPrevPage: false,
                },
            });
        });

        it("should indicate no next page when on last page", () => {
            const data = [{ id: "1" }];
            const result = PaginationHelper.buildPaginatedResponse(
                data,
                25,
                2,
                20,
            );

            expect(result.meta.hasNextPage).toBe(false);
            expect(result.meta.hasPrevPage).toBe(true);
            expect(result.meta.pages).toBe(2);
        });

        it("should indicate previous page only on page > 1", () => {
            const result1 = PaginationHelper.buildPaginatedResponse(
                [],
                100,
                1,
                20,
            );
            const result2 = PaginationHelper.buildPaginatedResponse(
                [],
                100,
                2,
                20,
            );

            expect(result1.meta.hasPrevPage).toBe(false);
            expect(result2.meta.hasPrevPage).toBe(true);
        });

        it("should calculate correct pages count", () => {
            const test1 = PaginationHelper.buildPaginatedResponse(
                [],
                100,
                1,
                20,
            );
            const test2 = PaginationHelper.buildPaginatedResponse(
                [],
                101,
                1,
                20,
            );
            const test3 = PaginationHelper.buildPaginatedResponse(
                [],
                20,
                1,
                20,
            );

            expect(test1.meta.pages).toBe(5);
            expect(test2.meta.pages).toBe(6);
            expect(test3.meta.pages).toBe(1);
        });

        it("should handle empty data array", () => {
            const result = PaginationHelper.buildPaginatedResponse(
                [],
                0,
                1,
                20,
            );

            expect(result.data).toEqual([]);
            expect(result.meta.total).toBe(0);
            expect(result.meta.pages).toBe(0);
            expect(result.meta.hasNextPage).toBe(false);
        });
    });

    describe("calculateOffset", () => {
        it("should calculate correct offset for page and limit", () => {
            expect(PaginationHelper.calculateOffset(1, 20)).toBe(0);
            expect(PaginationHelper.calculateOffset(2, 20)).toBe(20);
            expect(PaginationHelper.calculateOffset(5, 25)).toBe(100);
        });

        it("should throw for page < 1", () => {
            expect(() => PaginationHelper.calculateOffset(0, 20)).toThrow(
                BadRequestException,
            );
            expect(() => PaginationHelper.calculateOffset(-1, 20)).toThrow(
                BadRequestException,
            );
        });

        it("should accept page = 1 as minimum", () => {
            const result = PaginationHelper.calculateOffset(1, 20);
            expect(result).toBe(0);
        });
    });

    describe("isValidPageNumber", () => {
        it("should return true for valid page number", () => {
            expect(PaginationHelper.isValidPageNumber(1, 100, 20)).toBe(true);
            expect(PaginationHelper.isValidPageNumber(2, 100, 20)).toBe(true);
            expect(PaginationHelper.isValidPageNumber(5, 100, 20)).toBe(true);
        });

        it("should return false for page >= maxPages", () => {
            expect(PaginationHelper.isValidPageNumber(6, 100, 20)).toBe(false);
            expect(PaginationHelper.isValidPageNumber(10, 100, 20)).toBe(false);
        });

        it("should return false for page < 1", () => {
            expect(PaginationHelper.isValidPageNumber(0, 100, 20)).toBe(false);
            expect(PaginationHelper.isValidPageNumber(-1, 100, 20)).toBe(false);
        });

        it("should handle edge case: single page of results", () => {
            expect(PaginationHelper.isValidPageNumber(1, 20, 20)).toBe(true);
            expect(PaginationHelper.isValidPageNumber(2, 20, 20)).toBe(false);
        });

        it("should handle edge case: empty results", () => {
            expect(PaginationHelper.isValidPageNumber(1, 0, 20)).toBe(true);
            expect(PaginationHelper.isValidPageNumber(2, 0, 20)).toBe(false);
        });
    });
});
