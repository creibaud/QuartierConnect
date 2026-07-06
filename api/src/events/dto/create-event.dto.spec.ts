import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateEventDto, EVENT_CATEGORIES } from "./create-event.dto";

const base = {
    title: "Brocante de quartier",
    category: "community",
    date: "2026-08-15T09:00:00.000Z",
};

async function errorsFor(obj: Record<string, unknown>) {
    return validate(plainToInstance(CreateEventDto, obj));
}

describe("CreateEventDto.category", () => {
    it("rejects a category outside the enum", async () => {
        const errors = await errorsFor({ ...base, category: "garage-sale" });
        expect(errors.some((e) => e.property === "category")).toBe(true);
    });

    it("rejects a missing category", async () => {
        const errors = await errorsFor({ ...base, category: undefined });
        expect(errors.some((e) => e.property === "category")).toBe(true);
    });

    it("accepts every documented category", async () => {
        for (const category of EVENT_CATEGORIES) {
            const errors = await errorsFor({ ...base, category });
            expect(
                errors.filter((e) => e.property === "category"),
            ).toHaveLength(0);
        }
    });
});

describe("CreateEventDto.location", () => {
    it("accepts a valid GeoJSON Point", async () => {
        const errors = await errorsFor({
            ...base,
            location: { type: "Point", coordinates: [2.3522, 48.8566] },
        });
        expect(errors.filter((e) => e.property === "location")).toHaveLength(0);
    });

    it("rejects a non-Point type", async () => {
        const errors = await errorsFor({
            ...base,
            location: { type: "Polygon", coordinates: [2.3522, 48.8566] },
        });
        expect(errors.some((e) => e.property === "location")).toBe(true);
    });

    it("rejects coordinates with a wrong arity", async () => {
        const errors = await errorsFor({
            ...base,
            location: { type: "Point", coordinates: [2.3522] },
        });
        expect(errors.some((e) => e.property === "location")).toBe(true);
    });

    it("rejects non-numeric coordinates", async () => {
        const errors = await errorsFor({
            ...base,
            location: { type: "Point", coordinates: ["x", "y"] },
        });
        expect(errors.some((e) => e.property === "location")).toBe(true);
    });

    it("accepts an omitted location", async () => {
        const errors = await errorsFor(base);
        expect(errors.filter((e) => e.property === "location")).toHaveLength(0);
    });
});
