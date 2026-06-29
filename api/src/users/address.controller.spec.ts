import { AddressController } from "./address.controller";

function makeUpdateDb() {
    const set = jest.fn().mockReturnThis();
    const where = jest.fn().mockResolvedValue(undefined);
    return {
        update: jest.fn(() => ({ set, where })),
    } as unknown as never;
}

function makeSelectDb(rows: unknown[]) {
    const where = jest.fn().mockResolvedValue(rows);
    const from = jest.fn(() => ({ where }));
    return {
        select: jest.fn(() => ({ from })),
        update: jest.fn(),
    } as unknown as never;
}

describe("AddressController", () => {
    const geocoding = { geocode: jest.fn() };
    const neighborhoods = { findContainingPoint: jest.fn(), findById: jest.fn() };
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
        const ctrl = controller(makeUpdateDb());
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
        const ctrl = controller(makeUpdateDb());
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
        const ctrl = controller(makeUpdateDb());
        const res = await ctrl.submit(
            { user: { sub: "u1" } } as never,
            { address: "???" },
        );
        expect(res).toEqual({ status: "not_found" });
    });

    describe("GET location", () => {
        const mockGeometry = {
            type: "Polygon" as const,
            coordinates: [[[2.3, 48.8], [2.4, 48.8], [2.4, 48.9], [2.3, 48.8]]],
        };

        it("returns coords and neighborhood details when user is assigned", async () => {
            const db = makeSelectDb([{
                address: "12 rue de Reuilly, Paris",
                addressLat: 48.84,
                addressLng: 2.39,
                neighborhoodId: "nb-12",
            }]);
            neighborhoods.findById.mockResolvedValue({
                _id: { toString: () => "nb-12" },
                name: "12ème Ardt",
                geometry: mockGeometry,
            });
            const ctrl = controller(db);
            const res = await ctrl.location({ user: { sub: "u1" } } as never);
            expect(neighborhoods.findById).toHaveBeenCalledWith("nb-12");
            expect(res).toEqual({
                address: "12 rue de Reuilly, Paris",
                lat: 48.84,
                lng: 2.39,
                neighborhood: { id: "nb-12", name: "12ème Ardt", geometry: mockGeometry },
            });
        });

        it("returns nulls when user has no address", async () => {
            const db = makeSelectDb([{
                address: null,
                addressLat: null,
                addressLng: null,
                neighborhoodId: null,
            }]);
            const ctrl = controller(db);
            const res = await ctrl.location({ user: { sub: "u1" } } as never);
            expect(neighborhoods.findById).not.toHaveBeenCalled();
            expect(res).toEqual({ address: null, lat: null, lng: null, neighborhood: null });
        });

        it("returns coords with neighborhood:null when neighborhoodId is set but findById returns null (stale ref)", async () => {
            const db = makeSelectDb([{
                address: "some street",
                addressLat: 48.84,
                addressLng: 2.39,
                neighborhoodId: "nb-deleted",
            }]);
            neighborhoods.findById.mockResolvedValue(null);
            const ctrl = controller(db);
            const res = await ctrl.location({ user: { sub: "u1" } } as never);
            expect(neighborhoods.findById).toHaveBeenCalledWith("nb-deleted");
            expect(res).toEqual({ address: "some street", lat: 48.84, lng: 2.39, neighborhood: null });
        });
    });
});
