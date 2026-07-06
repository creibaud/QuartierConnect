import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { PaginationQueryDto } from "./pagination-query.dto";

async function validateQuery(query: Record<string, string>) {
    return validate(plainToInstance(PaginationQueryDto, query));
}

describe("PaginationQueryDto", () => {
    it("accepts an empty query (both fields optional)", async () => {
        const errors = await validateQuery({});
        expect(errors).toHaveLength(0);
    });

    it("accepts numeric strings within bounds", async () => {
        const errors = await validateQuery({ page: "2", limit: "50" });
        expect(errors).toHaveLength(0);
    });

    it("rejects a non-numeric page", async () => {
        const errors = await validateQuery({ page: "abc" });
        expect(errors.map((e) => e.property)).toContain("page");
    });

    it("rejects page 0", async () => {
        const errors = await validateQuery({ page: "0" });
        expect(errors.map((e) => e.property)).toContain("page");
    });

    it("rejects a negative page", async () => {
        const errors = await validateQuery({ page: "-3" });
        expect(errors.map((e) => e.property)).toContain("page");
    });

    it("rejects a non-integer limit", async () => {
        const errors = await validateQuery({ limit: "2.5" });
        expect(errors.map((e) => e.property)).toContain("limit");
    });

    it("rejects a limit above 100", async () => {
        const errors = await validateQuery({ limit: "101" });
        expect(errors.map((e) => e.property)).toContain("limit");
    });

    it("rejects limit 0", async () => {
        const errors = await validateQuery({ limit: "0" });
        expect(errors.map((e) => e.property)).toContain("limit");
    });
});
