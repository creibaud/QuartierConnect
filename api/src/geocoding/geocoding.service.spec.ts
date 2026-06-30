import { GeocodingService } from "./geocoding.service";

describe("GeocodingService", () => {
    let service: GeocodingService;
    let fetchMock: jest.Mock;

    beforeEach(() => {
        service = new GeocodingService();
        fetchMock = jest.fn();
        global.fetch = fetchMock as unknown as typeof fetch;
    });

    it("returns coordinates for a found address", async () => {
        fetchMock.mockResolvedValue({
            ok: true,
            json: () =>
                Promise.resolve([
                    {
                        lat: "48.8399",
                        lon: "2.3870",
                        display_name: "Paris 12e",
                    },
                ]),
        });
        const result = await service.geocode("12 rue de Reuilly, Paris");
        expect(result).toEqual({
            lat: 48.8399,
            lng: 2.387,
            displayName: "Paris 12e",
        });
    });

    it("returns null when no result", async () => {
        fetchMock.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve([]),
        });
        expect(await service.geocode("nowhere")).toBeNull();
    });

    it("returns null when the request fails", async () => {
        fetchMock.mockResolvedValue({ ok: false, status: 429 });
        expect(await service.geocode("paris")).toBeNull();
    });

    describe("search", () => {
        it("maps Nominatim results to {label,lat,lng}", async () => {
            fetchMock.mockResolvedValue({
                ok: true,
                json: () =>
                    Promise.resolve([
                        {
                            display_name: "1 Rue X, Paris",
                            lat: "48.85",
                            lon: "2.35",
                        },
                        {
                            display_name: "2 Rue Y, Paris",
                            lat: "48.86",
                            lon: "2.36",
                        },
                    ]),
            });
            const out = await service.search("rue");
            expect(out).toEqual([
                { label: "1 Rue X, Paris", lat: 48.85, lng: 2.35 },
                { label: "2 Rue Y, Paris", lat: 48.86, lng: 2.36 },
            ]);
        });

        it("returns [] on a non-ok response", async () => {
            fetchMock.mockResolvedValue({ ok: false, status: 429 });
            expect(await service.search("rue")).toEqual([]);
        });

        it("returns [] when fetch throws", async () => {
            fetchMock.mockRejectedValue(new Error("net"));
            expect(await service.search("rue")).toEqual([]);
        });
    });
});
