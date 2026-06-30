import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { CreateServiceDto } from "./create-service.dto";

const base = {
    title: "T",
    description: "D",
    category: "gardening",
    type: "free",
};

describe("CreateServiceDto.direction", () => {
    it("rejects a missing direction", () => {
        const dto = plainToInstance(CreateServiceDto, { ...base });
        expect(validateSync(dto).some((e) => e.property === "direction")).toBe(
            true,
        );
    });
    it("rejects an invalid direction", () => {
        const dto = plainToInstance(CreateServiceDto, {
            ...base,
            direction: "sell",
        });
        expect(validateSync(dto).some((e) => e.property === "direction")).toBe(
            true,
        );
    });
    it("accepts offer/request", () => {
        for (const direction of ["offer", "request"]) {
            const dto = plainToInstance(CreateServiceDto, {
                ...base,
                direction,
            });
            expect(
                validateSync(dto).filter((e) => e.property === "direction"),
            ).toHaveLength(0);
        }
    });
});
