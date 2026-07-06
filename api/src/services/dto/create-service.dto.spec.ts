import { plainToInstance } from "class-transformer";
import { validate, validateSync } from "class-validator";
import { CreateServiceDto, SERVICE_CATEGORIES } from "./create-service.dto";
import { UpdateServiceDto } from "./update-service.dto";

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

const durationBase = {
    title: "Gardening",
    description: "Weeding and hedges",
    category: "gardening",
    direction: "offer",
};

async function errorsFor(obj: Record<string, unknown>) {
    return validate(plainToInstance(CreateServiceDto, obj));
}

describe("CreateServiceDto duration rule", () => {
    it("rejects a paid service without duration", async () => {
        const errors = await errorsFor({ ...durationBase, type: "paid" });
        expect(errors.some((e) => e.property === "duration")).toBe(true);
    });
    it("accepts a paid service with duration", async () => {
        const errors = await errorsFor({
            ...durationBase,
            type: "paid",
            duration: 60,
        });
        expect(errors).toHaveLength(0);
    });
    it("accepts a free service without duration", async () => {
        const errors = await errorsFor({ ...durationBase, type: "free" });
        expect(errors).toHaveLength(0);
    });
    it("rejects an invalid duration even on a free service", async () => {
        for (const duration of [0, -10, 1.5]) {
            const errors = await errorsFor({
                ...durationBase,
                type: "free",
                duration,
            });
            expect(errors.some((e) => e.property === "duration")).toBe(true);
        }
    });
});

describe("CreateServiceDto.pointsAmount", () => {
    it("rejects a zero pointsAmount", async () => {
        const errors = await errorsFor({
            ...durationBase,
            type: "free",
            pointsAmount: 0,
        });
        expect(errors.some((e) => e.property === "pointsAmount")).toBe(true);
    });
    it("rejects a negative pointsAmount", async () => {
        const errors = await errorsFor({
            ...durationBase,
            type: "free",
            pointsAmount: -1,
        });
        expect(errors.some((e) => e.property === "pointsAmount")).toBe(true);
    });
});

describe("CreateServiceDto.category", () => {
    it("rejects a category outside the allowed list", async () => {
        const errors = await errorsFor({
            ...durationBase,
            type: "free",
            category: "cooking",
        });
        expect(errors.some((e) => e.property === "category")).toBe(true);
    });
    it("accepts every allowed category", async () => {
        for (const category of SERVICE_CATEGORIES) {
            const errors = await errorsFor({
                ...durationBase,
                type: "free",
                category,
            });
            expect(errors).toHaveLength(0);
        }
    });
});

describe("CreateServiceDto.location", () => {
    async function errorsForLocation(location: unknown) {
        return errorsFor({ ...durationBase, type: "free", location });
    }

    it("accepts a valid GeoJSON Point", async () => {
        const errors = await errorsForLocation({
            type: "Point",
            coordinates: [2.3522, 48.8566],
        });
        expect(errors).toHaveLength(0);
    });
    it("rejects a non-Point GeoJSON type", async () => {
        const errors = await errorsForLocation({
            type: "Polygon",
            coordinates: [2.3522, 48.8566],
        });
        expect(errors.some((e) => e.property === "location")).toBe(true);
    });
    it("rejects coordinates with a single value", async () => {
        const errors = await errorsForLocation({
            type: "Point",
            coordinates: [1],
        });
        expect(errors.some((e) => e.property === "location")).toBe(true);
    });
    it("rejects non-numeric coordinates", async () => {
        const errors = await errorsForLocation({
            type: "Point",
            coordinates: ["2.35", "48.85"],
        });
        expect(errors.some((e) => e.property === "location")).toBe(true);
    });
});

async function updateErrorsFor(obj: Record<string, unknown>) {
    return validate(plainToInstance(UpdateServiceDto, obj));
}

describe("UpdateServiceDto (partial PATCH bodies)", () => {
    it("rejects a zero duration even without a type", async () => {
        const errors = await updateErrorsFor({ duration: 0 });
        expect(errors.some((e) => e.property === "duration")).toBe(true);
    });
    it("rejects a zero pointsAmount", async () => {
        const errors = await updateErrorsFor({ pointsAmount: 0 });
        expect(errors.some((e) => e.property === "pointsAmount")).toBe(true);
    });
    it("accepts an empty patch body", async () => {
        expect(await updateErrorsFor({})).toHaveLength(0);
    });
});
