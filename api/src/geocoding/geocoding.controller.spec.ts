import { Test } from "@nestjs/testing";
import { GeocodingController } from "./geocoding.controller";
import { GeocodingService } from "./geocoding.service";

describe("GeocodingController", () => {
    let controller: GeocodingController;
    let search: jest.Mock;

    beforeEach(async () => {
        search = jest.fn().mockResolvedValue([{ label: "X", lat: 1, lng: 2 }]);
        const mod = await Test.createTestingModule({
            controllers: [GeocodingController],
            providers: [{ provide: GeocodingService, useValue: { search } }],
        }).compile();
        controller = mod.get(GeocodingController);
    });

    it("returns suggestions for a valid query", async () => {
        expect(await controller.search("rue de")).toEqual([
            { label: "X", lat: 1, lng: 2 },
        ]);
        expect(search).toHaveBeenCalledWith("rue de");
    });

    it("short-circuits a query under 3 chars", async () => {
        expect(await controller.search("ru")).toEqual([]);
        expect(search).not.toHaveBeenCalled();
    });

    it("treats a missing query as empty", async () => {
        expect(await controller.search(undefined)).toEqual([]);
        expect(search).not.toHaveBeenCalled();
    });
});
