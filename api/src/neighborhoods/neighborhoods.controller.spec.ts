import { NotFoundException } from "@nestjs/common";
import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { DRIZZLE_TOKEN } from "../database/drizzle.module";
import { NEO4J_DRIVER } from "../social/neo4j/neo4j.provider";
import { SocialService } from "../social/social.service";
import { NeighborhoodsController } from "./neighborhoods.controller";
import { NeighborhoodsService } from "./neighborhoods.service";
import { Neighborhood } from "./schemas/neighborhood.schema";

const mockNeighborhood = {
    _id: "mongo-id-1",
    name: "Belleville",
    city: "Paris",
    description: "Le quartier Belleville",
};

describe("NeighborhoodsController", () => {
    let controller: NeighborhoodsController;
    let model: any;
    let dbUpdateSet: jest.Mock;
    let dbSelectWhere: jest.Mock;
    let findContainingPoint: jest.Mock;
    let neo4jRun: jest.Mock;

    beforeEach(async () => {
        dbUpdateSet = jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue(undefined),
        });
        dbSelectWhere = jest.fn().mockResolvedValue([]);
        findContainingPoint = jest.fn().mockResolvedValue(null);
        neo4jRun = jest.fn().mockResolvedValue(undefined);

        const findChain = {
            skip: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            exec: jest.fn().mockResolvedValue([mockNeighborhood]),
        };
        model = {
            find: jest.fn().mockReturnValue(findChain),
            findById: jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockNeighborhood),
            }),
            create: jest.fn().mockResolvedValue(mockNeighborhood),
            findByIdAndUpdate: jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockNeighborhood),
            }),
            findByIdAndDelete: jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockNeighborhood),
            }),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [NeighborhoodsController],
            providers: [
                { provide: getModelToken(Neighborhood.name), useValue: model },
                {
                    provide: NeighborhoodsService,
                    useValue: {
                        assertNoOverlap: jest.fn().mockResolvedValue(undefined),
                        findContainingPoint,
                    },
                },
                {
                    provide: SocialService,
                    useValue: {
                        syncNeighborhood: jest
                            .fn()
                            .mockResolvedValue(undefined),
                        deleteNode: jest.fn().mockResolvedValue(undefined),
                    },
                },
                {
                    provide: DRIZZLE_TOKEN,
                    useValue: {
                        select: jest.fn().mockReturnValue({
                            from: jest.fn().mockReturnValue({
                                where: dbSelectWhere,
                            }),
                        }),
                        update: jest.fn().mockReturnValue({ set: dbUpdateSet }),
                    },
                },
                {
                    provide: NEO4J_DRIVER,
                    useValue: {
                        session: jest.fn().mockReturnValue({
                            run: neo4jRun,
                            close: jest.fn().mockResolvedValue(undefined),
                        }),
                    },
                },
            ],
        }).compile();

        controller = module.get<NeighborhoodsController>(
            NeighborhoodsController,
        );
    });

    it("GET /neighborhoods returns list", async () => {
        const result = await controller.findAll();
        expect(result).toHaveLength(1);
        expect(model.find).toHaveBeenCalled();
    });

    it("GET /neighborhoods/:id returns one", async () => {
        const result = await controller.findOne("mongo-id-1");
        expect(result).toEqual(mockNeighborhood);
    });

    it("GET /neighborhoods/:id throws 404 when not found", async () => {
        model.findById.mockReturnValue({
            exec: jest.fn().mockResolvedValue(null),
        });
        await expect(controller.findOne("bad-id")).rejects.toThrow(
            NotFoundException,
        );
    });

    it("POST /neighborhoods creates a neighborhood", async () => {
        const result = await controller.create({
            name: "Belleville",
            city: "Paris",
        });
        expect(result).toEqual(mockNeighborhood);
    });

    it("PATCH /neighborhoods/:id updates a neighborhood", async () => {
        const result = await controller.update("mongo-id-1", {
            name: "Updated",
        });
        expect(result).toEqual(mockNeighborhood);
    });

    it("PATCH /neighborhoods/:id throws 404 when not found", async () => {
        model.findByIdAndUpdate.mockReturnValue({
            exec: jest.fn().mockResolvedValue(null),
        });
        await expect(
            controller.update("bad-id", { name: "X" }),
        ).rejects.toThrow(NotFoundException);
    });

    it("DELETE /neighborhoods/:id removes a neighborhood", async () => {
        const result = await controller.remove("mongo-id-1");
        expect(result).toEqual({ success: true });
    });

    it("DELETE /neighborhoods/:id throws 404 when not found", async () => {
        model.findByIdAndDelete.mockReturnValue({
            exec: jest.fn().mockResolvedValue(null),
        });
        await expect(controller.remove("bad-id")).rejects.toThrow(
            NotFoundException,
        );
    });

    it("uncoveredAddresses returns pending residents with their point", async () => {
        dbSelectWhere.mockResolvedValueOnce([
            { id: "u1", firstName: "Alice", lat: 1, lng: 2, address: "x" },
        ]);
        const res = await controller.uncoveredAddresses();
        expect(res).toEqual([
            { userId: "u1", firstName: "Alice", lat: 1, lng: 2, address: "x" },
        ]);
    });

    it("reassigns pending users covered by the newly created neighborhood", async () => {
        dbSelectWhere.mockResolvedValueOnce([
            { id: "u1", lat: 48.8399, lng: 2.387 },
        ]);
        findContainingPoint.mockResolvedValueOnce({
            _id: { toString: () => "nb-12" },
        });
        const validCreateDto = { name: "Belleville", city: "Paris" };
        await controller.create(validCreateDto);
        expect(dbUpdateSet).toHaveBeenCalledWith(
            expect.objectContaining({ neighborhoodId: "nb-12" }),
        );
        expect(neo4jRun).toHaveBeenCalledTimes(1);
    });
});
