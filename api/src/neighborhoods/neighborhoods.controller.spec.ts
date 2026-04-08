import { NotFoundException } from "@nestjs/common";
import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
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

    beforeEach(async () => {
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
});
