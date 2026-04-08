import { BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { DRIZZLE_TOKEN } from "../database/drizzle.module";
import { Event } from "../events/schemas/event.schema";
import { Neighborhood } from "../neighborhoods/schemas/neighborhood.schema";
import { Service } from "../services/schemas/service.schema";
import { DslService } from "./dsl.service";

const mockExecute = jest.fn();

jest.mock("pythonia", () => ({
    python: jest.fn().mockResolvedValue({ execute: mockExecute }),
}));

const mockNeighborhoodModel = {
    find: jest
        .fn()
        .mockReturnValue({ lean: () => ({ exec: () => Promise.resolve([]) }) }),
    countDocuments: jest.fn().mockResolvedValue(0),
};

const mockServiceModel = {
    find: jest
        .fn()
        .mockReturnValue({ lean: () => ({ exec: () => Promise.resolve([]) }) }),
    countDocuments: jest.fn().mockResolvedValue(0),
};

const mockEventModel = {
    find: jest
        .fn()
        .mockReturnValue({ lean: () => ({ exec: () => Promise.resolve([]) }) }),
    countDocuments: jest.fn().mockResolvedValue(0),
};

const mockDb = {
    select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue([]),
            }),
        }),
    }),
};

describe("DslService", () => {
    let service: DslService;

    beforeEach(async () => {
        jest.clearAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DslService,
                {
                    provide: ConfigService,
                    useValue: { get: jest.fn().mockReturnValue("/tmp/dsl") },
                },
                { provide: DRIZZLE_TOKEN, useValue: mockDb },
                {
                    provide: getModelToken(Neighborhood.name),
                    useValue: mockNeighborhoodModel,
                },
                {
                    provide: getModelToken(Service.name),
                    useValue: mockServiceModel,
                },
                {
                    provide: getModelToken(Event.name),
                    useValue: mockEventModel,
                },
            ],
        }).compile();

        service = module.get<DslService>(DslService);
    });

    it("executes FIND on MongoDB collection and returns array", async () => {
        const docs = [{ _id: "1", name: "Belleville" }];
        mockExecute.mockResolvedValue(
            JSON.stringify({
                type: "find",
                collection: "neighborhoods",
                filter: {},
                limit: null,
            }),
        );
        mockNeighborhoodModel.find.mockReturnValue({
            lean: () => ({ exec: () => Promise.resolve(docs) }),
        });

        const result = await service.execute("FIND neighborhoods");
        expect(Array.isArray(result)).toBe(true);
    });

    it("executes COUNT on MongoDB collection and returns count object", async () => {
        mockExecute.mockResolvedValue(
            JSON.stringify({
                type: "count",
                collection: "neighborhoods",
                filter: {},
                limit: null,
            }),
        );
        mockNeighborhoodModel.countDocuments.mockResolvedValue(42);

        const result = await service.execute("COUNT neighborhoods");
        expect(result).toEqual({ count: 42 });
    });

    it("executes FIND on PostgreSQL incidents and returns array", async () => {
        mockExecute.mockResolvedValue(
            JSON.stringify({
                type: "find",
                collection: "incidents",
                filter: { status: "open" },
                limit: 10,
            }),
        );

        const result = await service.execute(
            'FIND incidents WHERE status = "open" LIMIT 10',
        );
        expect(Array.isArray(result)).toBe(true);
    });

    it("throws BadRequestException on SyntaxError from Python", async () => {
        mockExecute.mockRejectedValue(
            new Error("SyntaxError: unexpected token"),
        );

        await expect(service.execute("INVALID QUERY")).rejects.toThrow(
            BadRequestException,
        );
    });

    it("throws BadRequestException on ValueError from Python", async () => {
        mockExecute.mockRejectedValue(
            new Error("ValueError: unknown collection"),
        );

        await expect(service.execute("FIND unknown")).rejects.toThrow(
            BadRequestException,
        );
    });

    it("throws BadRequestException on unknown execution error", async () => {
        mockExecute.mockRejectedValue(new Error("Some internal error"));

        await expect(service.execute("FIND incidents")).rejects.toThrow(
            BadRequestException,
        );
    });

    it("reuses cached dsl module on second call", async () => {
        const { python } = await import("pythonia");
        mockExecute.mockResolvedValue(
            JSON.stringify({
                type: "find",
                collection: "neighborhoods",
                filter: {},
                limit: null,
            }),
        );

        await service.execute("FIND neighborhoods");
        await service.execute("FIND neighborhoods");

        expect(python).toHaveBeenCalledTimes(1);
    });
});
