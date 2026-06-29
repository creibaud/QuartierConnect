import { AddressController } from "./address.controller";

function makeDb() {
    const set = jest.fn().mockReturnThis();
    const where = jest.fn().mockResolvedValue(undefined);
    return {
        update: jest.fn(() => ({ set, where })),
    } as unknown as never;
}

describe("AddressController", () => {
    const geocoding = { geocode: jest.fn() };
    const neighborhoods = { findContainingPoint: jest.fn() };
    const run = jest.fn();
    const neo4j = { session: () => ({ run, close: jest.fn() }) };

    function controller(db: never) {
        return new AddressController(
            db,
            geocoding as never,
            neighborhoods as never,
            neo4j as never,
        );
    }

    afterEach(() => jest.clearAllMocks());

    it("assigns the neighborhood when the point is inside a polygon", async () => {
        geocoding.geocode.mockResolvedValue({
            lat: 48.8399,
            lng: 2.387,
            displayName: "Paris 12e",
        });
        neighborhoods.findContainingPoint.mockResolvedValue({
            _id: { toString: () => "nb-12" },
            name: "Paris 12e",
        });
        const ctrl = controller(makeDb());
        const res = await ctrl.submit(
            { user: { sub: "u1" } } as never,
            { address: "12 rue de Reuilly" },
        );
        expect(neighborhoods.findContainingPoint).toHaveBeenCalledWith(2.387, 48.8399);
        expect(res).toEqual({
            status: "assigned",
            neighborhoodId: "nb-12",
            displayName: "Paris 12e",
        });
        expect(run).toHaveBeenCalledTimes(1);
    });

    it("returns pending when the point is outside every polygon", async () => {
        geocoding.geocode.mockResolvedValue({
            lat: 1,
            lng: 1,
            displayName: "Somewhere",
        });
        neighborhoods.findContainingPoint.mockResolvedValue(null);
        const ctrl = controller(makeDb());
        const res = await ctrl.submit(
            { user: { sub: "u1" } } as never,
            { address: "nowhere" },
        );
        expect(res).toEqual({
            status: "pending",
            neighborhoodId: null,
            displayName: "Somewhere",
        });
    });

    it("returns not_found when geocoding fails", async () => {
        geocoding.geocode.mockResolvedValue(null);
        const ctrl = controller(makeDb());
        const res = await ctrl.submit(
            { user: { sub: "u1" } } as never,
            { address: "???" },
        );
        expect(res).toEqual({ status: "not_found" });
    });
});
