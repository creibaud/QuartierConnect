import { ConflictException } from "@nestjs/common";
import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { NeighborhoodsService } from "./neighborhoods.service";
import { Neighborhood } from "./schemas/neighborhood.schema";
import type { GeoJsonPolygon } from "./schemas/neighborhood.schema";

const samplePolygon: GeoJsonPolygon = {
    type: "Polygon",
    coordinates: [
        [
            [2.3, 48.8],
            [2.4, 48.8],
            [2.4, 48.9],
            [2.3, 48.9],
            [2.3, 48.8],
        ],
    ],
};

const mockNeighborhood = {
    _id: { toString: () => "nbh-1" },
    name: "Belleville",
    city: "Paris",
};

describe("NeighborhoodsService", () => {
    let service: NeighborhoodsService;
    let model: any;

    beforeEach(async () => {
        model = {
            find: jest.fn(),
            countDocuments: jest.fn().mockResolvedValue(0),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                NeighborhoodsService,
                { provide: getModelToken(Neighborhood.name), useValue: model },
            ],
        }).compile();

        service = module.get<NeighborhoodsService>(NeighborhoodsService);
    });

    it("assertNoOverlap passes when no overlapping neighborhoods exist", async () => {
        model.find.mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });
        await expect(
            service.assertNoOverlap(samplePolygon),
        ).resolves.toBeUndefined();
    });

    it("assertNoOverlap throws ConflictException when overlap detected", async () => {
        model.find.mockReturnValue({
            exec: jest.fn().mockResolvedValue([mockNeighborhood]),
        });
        await expect(service.assertNoOverlap(samplePolygon)).rejects.toThrow(
            ConflictException,
        );
    });

    it("assertNoOverlap ignores the excludeId neighborhood (self-update)", async () => {
        model.find.mockReturnValue({
            exec: jest.fn().mockResolvedValue([mockNeighborhood]),
        });
        await expect(
            service.assertNoOverlap(samplePolygon, "nbh-1"),
        ).resolves.toBeUndefined();
    });

    it("assertNoOverlap throws when overlapping neighbor is different from excludeId", async () => {
        const other = {
            _id: { toString: () => "nbh-2" },
            name: "Ménilmontant",
            city: "Paris",
        };
        model.find.mockReturnValue({
            exec: jest.fn().mockResolvedValue([mockNeighborhood, other]),
        });
        await expect(
            service.assertNoOverlap(samplePolygon, "nbh-1"),
        ).rejects.toThrow(ConflictException);
    });

    it("findOverlapping calls $geoIntersects with the provided geometry", async () => {
        const execMock = jest.fn().mockResolvedValue([]);
        model.find.mockReturnValue({ exec: execMock });
        await service.findOverlapping(samplePolygon);
        expect(model.find).toHaveBeenCalledWith({
            geometry: { $geoIntersects: { $geometry: samplePolygon } },
        });
    });
});
