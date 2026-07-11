import {
    escapeLike,
    escapeRegex,
    parsePagination,
    resolveSort,
    setPageHeaders,
} from "./pagination";

describe("parsePagination", () => {
    it("defaults to page 1, limit 20", () => {
        expect(parsePagination(undefined, undefined)).toEqual({
            pageNum: 1,
            limitNum: 20,
            skip: 0,
        });
    });

    it("clamps limit to 100 and page to >=1", () => {
        expect(parsePagination("0", "500")).toEqual({
            pageNum: 1,
            limitNum: 100,
            skip: 0,
        });
    });

    it("computes skip from page and limit", () => {
        expect(parsePagination("3", "10")).toEqual({
            pageNum: 3,
            limitNum: 10,
            skip: 20,
        });
    });
});

describe("resolveSort", () => {
    const allowed = ["createdAt", "title"] as const;

    it("falls back on an unknown field", () => {
        expect(resolveSort("DROP TABLE", "asc", allowed, "createdAt")).toEqual({
            field: "createdAt",
            direction: "asc",
        });
    });

    it("honours an allowed field and defaults to desc", () => {
        expect(resolveSort("title", undefined, allowed, "createdAt")).toEqual({
            field: "title",
            direction: "desc",
        });
    });
});

describe("escapers", () => {
    it("escapes LIKE metacharacters", () => {
        expect(escapeLike("50%_off\\")).toBe("50\\%\\_off\\\\");
    });

    it("escapes regex metacharacters", () => {
        expect(escapeRegex("a.b*c")).toBe("a\\.b\\*c");
    });
});

describe("setPageHeaders", () => {
    it("sets the count and page headers", () => {
        const calls: Record<string, string> = {};
        setPageHeaders({ setHeader: (k, v) => (calls[k] = v) }, 45, 20);
        expect(calls["X-Total-Count"]).toBe("45");
        expect(calls["X-Total-Pages"]).toBe("3");
    });

    it("reports at least one page for an empty result", () => {
        const calls: Record<string, string> = {};
        setPageHeaders({ setHeader: (k, v) => (calls[k] = v) }, 0, 20);
        expect(calls["X-Total-Pages"]).toBe("1");
    });
});
