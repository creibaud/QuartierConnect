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

// limit spy is exposed so tests can assert the 100-result cap
const mongoQuery = (docs: unknown[] = []) => {
    const limit = jest.fn().mockReturnValue({
        exec: () => Promise.resolve(docs),
    });
    return { chain: { lean: () => ({ limit }) }, limit };
};

const mockNeighborhoodModel = {
    find: jest.fn().mockReturnValue(mongoQuery().chain),
    countDocuments: jest.fn().mockResolvedValue(0),
};

const mockServiceModel = {
    find: jest.fn().mockReturnValue(mongoQuery().chain),
    countDocuments: jest.fn().mockResolvedValue(0),
};

const mockEventModel = {
    find: jest.fn().mockReturnValue(mongoQuery().chain),
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
        mockNeighborhoodModel.find.mockReturnValue(mongoQuery(docs).chain);

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

    it("executes COUNT on PostgreSQL incidents without filter", async () => {
        mockExecute.mockResolvedValue(
            JSON.stringify({
                type: "count",
                collection: "incidents",
                filter: {},
                limit: null,
            }),
        );
        mockDb.select.mockReturnValue({
            from: jest.fn().mockReturnValue({
                where: jest.fn().mockResolvedValue([{ value: 2 }]),
            }),
        });

        const result = await service.execute("COUNT incidents");
        expect(result).toEqual({ count: 2 });
    });

    it("rejects incidents filter using a Mongo operator value", async () => {
        mockExecute.mockResolvedValue(
            JSON.stringify({
                type: "find",
                collection: "incidents",
                filter: { status: { $ne: "open" } },
                limit: null,
            }),
        );

        await expect(
            service.execute('FIND incidents WHERE status != "open"'),
        ).rejects.toThrow(
            'Only simple equality filters on "status" are supported for incidents (PostgreSQL-backed collection)',
        );
    });

    it("rejects incidents filter on an unsupported field", async () => {
        mockExecute.mockResolvedValue(
            JSON.stringify({
                type: "find",
                collection: "incidents",
                filter: { category: "roads" },
                limit: null,
            }),
        );

        await expect(
            service.execute('FIND incidents WHERE category = "roads"'),
        ).rejects.toThrow(BadRequestException);
    });

    it("rejects incidents filter combining several fields", async () => {
        mockExecute.mockResolvedValue(
            JSON.stringify({
                type: "count",
                collection: "incidents",
                filter: { status: "open", category: "roads" },
                limit: null,
            }),
        );

        await expect(
            service.execute(
                'COUNT incidents WHERE status = "open" AND category = "roads"',
            ),
        ).rejects.toThrow(
            'Only simple equality filters on "status" are supported for incidents (PostgreSQL-backed collection)',
        );
    });

    it("executes FIND on PostgreSQL users filtered by role", async () => {
        mockExecute.mockResolvedValue(
            JSON.stringify({
                type: "find",
                collection: "users",
                filter: { role: "admin" },
                limit: null,
            }),
        );
        mockDb.select.mockReturnValue({
            from: jest.fn().mockReturnValue({
                where: jest.fn().mockReturnValue({
                    limit: jest
                        .fn()
                        .mockResolvedValue([{ id: "u1", role: "admin" }]),
                }),
            }),
        });

        const result = await service.execute('FIND users WHERE role = "admin"');
        expect(result).toEqual([{ id: "u1", role: "admin" }]);
    });

    it("executes COUNT on PostgreSQL users without filter", async () => {
        mockExecute.mockResolvedValue(
            JSON.stringify({
                type: "count",
                collection: "users",
                filter: {},
                limit: null,
            }),
        );
        mockDb.select.mockReturnValue({
            from: jest.fn().mockReturnValue({
                where: jest.fn().mockResolvedValue([{ value: 1 }]),
            }),
        });

        const result = await service.execute("COUNT users");
        expect(result).toEqual({ count: 1 });
    });

    it("rejects users filter on an unsupported field", async () => {
        mockExecute.mockResolvedValue(
            JSON.stringify({
                type: "find",
                collection: "users",
                filter: { email: "alice@demo.fr" },
                limit: null,
            }),
        );

        await expect(
            service.execute('FIND users WHERE email = "alice@demo.fr"'),
        ).rejects.toThrow(
            'Only simple equality filters on "role" are supported for users (PostgreSQL-backed collection)',
        );
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

    it("caps a FIND without LIMIT (and an oversized one) at 100 results", async () => {
        mockExecute.mockResolvedValue(
            JSON.stringify({
                type: "find",
                collection: "services",
                filter: {},
                limit: 999999,
            }),
        );
        const { chain, limit } = mongoQuery();
        mockServiceModel.find.mockReturnValue(chain);

        await service.execute("FIND services LIMIT 999999");
        expect(limit).toHaveBeenCalledWith(100);
    });

    it("scopes a moderator's Mongo FIND to their neighborhood", async () => {
        mockExecute.mockResolvedValue(
            JSON.stringify({
                type: "find",
                collection: "services",
                filter: { type: "free" },
                limit: null,
            }),
        );

        await service.execute('FIND services WHERE type = "free"', {
            sub: "mod-1",
            role: "moderator",
            neighborhoodId: "nbh-1",
        });
        expect(mockServiceModel.find).toHaveBeenCalledWith({
            type: "free",
            neighborhoodId: "nbh-1",
        });
    });

    it("lets an admin query across all neighborhoods", async () => {
        mockExecute.mockResolvedValue(
            JSON.stringify({
                type: "find",
                collection: "services",
                filter: { type: "free" },
                limit: null,
            }),
        );

        await service.execute('FIND services WHERE type = "free"', {
            sub: "adm-1",
            role: "admin",
            neighborhoodId: null,
        });
        expect(mockServiceModel.find).toHaveBeenCalledWith({ type: "free" });
    });

    it("returns nothing to a scoped requester without a neighborhood", async () => {
        mockExecute.mockResolvedValue(
            JSON.stringify({
                type: "find",
                collection: "incidents",
                filter: {},
                limit: null,
            }),
        );

        const result = await service.execute("FIND incidents", {
            sub: "mod-1",
            role: "moderator",
            neighborhoodId: null,
        });
        expect(result).toEqual([]);
        expect(mockDb.select).not.toHaveBeenCalled();
    });

    it("scopes a moderator's incidents COUNT to their neighborhood", async () => {
        mockExecute.mockResolvedValue(
            JSON.stringify({
                type: "count",
                collection: "incidents",
                filter: {},
                limit: null,
            }),
        );
        const whereSpy = jest.fn().mockResolvedValue([{ value: 1 }]);
        mockDb.select.mockReturnValue({
            from: jest.fn().mockReturnValue({ where: whereSpy }),
        });

        const result = await service.execute("COUNT incidents", {
            sub: "mod-1",
            role: "moderator",
            neighborhoodId: "nbh-1",
        });
        expect(result).toEqual({ count: 1 });
        expect(whereSpy).toHaveBeenCalledWith(expect.anything());
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
