import { Test } from "@nestjs/testing";
import { DRIZZLE_TOKEN } from "../database/drizzle.module";
import { GeocodingController } from "./geocoding.controller";
import { GeocodingService } from "./geocoding.service";

const authReq = (sub = "user-1") => ({ user: { sub } });

describe("GeocodingController", () => {
    let controller: GeocodingController;
    let search: jest.Mock;
    let db: { select: jest.Mock; from: jest.Mock; where: jest.Mock };

    beforeEach(async () => {
        search = jest.fn().mockResolvedValue([{ label: "X", lat: 1, lng: 2 }]);
        // Drizzle chain: select().from().where() -> [{ lat, lng }]
        db = {
            select: jest.fn().mockReturnThis(),
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockResolvedValue([{ lat: 48.85, lng: 2.35 }]),
        };
        const mod = await Test.createTestingModule({
            controllers: [GeocodingController],
            providers: [
                { provide: GeocodingService, useValue: { search } },
                { provide: DRIZZLE_TOKEN, useValue: db },
            ],
        }).compile();
        controller = mod.get(GeocodingController);
    });

    it("returns suggestions and softly biases by the caller's home viewbox", async () => {
        expect(
            await controller.search(authReq() as any, "rue de", "fr"),
        ).toEqual([{ label: "X", lat: 1, lng: 2 }]);
        expect(search).toHaveBeenCalledWith("rue de", {
            lang: "fr",
            viewbox: "1.85,48.35,2.85,49.35",
        });
    });

    it("omits the viewbox when the caller has no home coordinates", async () => {
        db.where.mockResolvedValue([{ lat: null, lng: null }]);
        await controller.search(authReq() as any, "rue de", "en");
        expect(search).toHaveBeenCalledWith("rue de", {
            lang: "en",
            viewbox: undefined,
        });
    });

    it("short-circuits a query under 3 chars", async () => {
        expect(await controller.search(authReq() as any, "ru")).toEqual([]);
        expect(search).not.toHaveBeenCalled();
    });

    it("treats a missing query as empty", async () => {
        expect(await controller.search(authReq() as any, undefined)).toEqual(
            [],
        );
        expect(search).not.toHaveBeenCalled();
    });
});
