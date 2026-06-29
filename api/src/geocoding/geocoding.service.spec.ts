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
            json: async () => [
                { lat: "48.8399", lon: "2.3870", display_name: "Paris 12e" },
            ],
        });
        const result = await service.geocode("12 rue de Reuilly, Paris");
        expect(result).toEqual({
            lat: 48.8399,
            lng: 2.387,
            displayName: "Paris 12e",
        });
    });

    it("returns null when no result", async () => {
        fetchMock.mockResolvedValue({ ok: true, json: async () => [] });
        expect(await service.geocode("nowhere")).toBeNull();
    });

    it("returns null when the request fails", async () => {
        fetchMock.mockResolvedValue({ ok: false, status: 429 });
        expect(await service.geocode("paris")).toBeNull();
    });
});
