import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
} from "@nestjs/common";
import { ObjectId } from "mongodb";
import type { VoteOption } from "src/database/mongodb/models/vote.model";
import type { MongoDatabase } from "src/database/mongodb/mongodb.type";
import { BinaryStrategy } from "./strategies/binary.strategy";
import { MultiChoiceStrategy } from "./strategies/multi-choice.strategy";
import { SingleChoiceStrategy } from "./strategies/single-choice.strategy";
import { VoteStrategyFactory } from "./strategies/vote-strategy.factory";
import { WeightedStrategy } from "./strategies/weighted.strategy";
import { VotesService } from "./votes.service";

jest.mock("uuid", () => ({ v4: () => "mock-uuid" }));

const VOTE_ID = new ObjectId().toHexString();
const CREATOR_ID = "creator-uuid";
const VOTER_ID = "voter-uuid";

const futureDate = new Date(Date.now() + 60 * 60 * 1000);
const pastDate = new Date(Date.now() - 60 * 60 * 1000);

const binaryVote = {
    _id: new ObjectId(VOTE_ID),
    id: VOTE_ID,
    quartierId: "quartier-uuid",
    creatorId: CREATOR_ID,
    title: "Should we plant trees?",
    type: "binary" as const,
    options: [
        { id: "opt-yes", label: "yes", votesCount: 0 },
        { id: "opt-no", label: "no", votesCount: 0 },
    ] as VoteOption[],
    durationMinutes: 60,
    isAnonymous: false,
    showResults: true,
    startedAt: new Date(),
    endsAt: futureDate,
    createdAt: new Date(),
};

const singleChoiceVote = {
    ...binaryVote,
    _id: new ObjectId(VOTE_ID),
    type: "single_choice" as const,
    options: [
        { id: "opt-a", label: "Option A", votesCount: 0 },
        { id: "opt-b", label: "Option B", votesCount: 0 },
    ] as VoteOption[],
};

const hiddenResultsVote = {
    ...binaryVote,
    showResults: false,
    endsAt: futureDate,
};

const expiredVote = {
    ...binaryVote,
    endsAt: pastDate,
};

function buildMongoCursor(data: unknown[]) {
    return {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue(data),
        find: jest.fn().mockReturnThis(),
    };
}

describe("VotesService", () => {
    let service: VotesService;
    let mongo: jest.Mocked<MongoDatabase>;
    let factory: VoteStrategyFactory;

    const binaryStrategy = new BinaryStrategy();
    const singleChoiceStrategy = new SingleChoiceStrategy();
    const multiChoiceStrategy = new MultiChoiceStrategy();
    const weightedStrategy = new WeightedStrategy();

    beforeEach(() => {
        jest.clearAllMocks();

        factory = new VoteStrategyFactory(
            binaryStrategy,
            singleChoiceStrategy,
            multiChoiceStrategy,
            weightedStrategy,
        );

        mongo = {
            collection: jest.fn(),
        } as unknown as jest.Mocked<MongoDatabase>;

        service = new VotesService(mongo, factory);
    });

    describe("create", () => {
        it("creates yes/no options automatically for binary vote type", async () => {
            const insertOne = jest
                .fn()
                .mockResolvedValue({ insertedId: new ObjectId(VOTE_ID) });
            mongo.collection = jest.fn().mockReturnValue({ insertOne });
            service = new VotesService(mongo, factory);

            const result = await service.create(CREATOR_ID, {
                quartierId: "quartier-uuid",
                title: "Should we plant trees?",
                type: "binary",
                options: [],
                durationMinutes: 60,
            });

            expect(result.options).toHaveLength(2);
            expect(result.options[0].label).toBe("yes");
            expect(result.options[1].label).toBe("no");
        });

        it("maps user-provided options for non-binary types", async () => {
            const insertOne = jest
                .fn()
                .mockResolvedValue({ insertedId: new ObjectId(VOTE_ID) });
            mongo.collection = jest.fn().mockReturnValue({ insertOne });
            service = new VotesService(mongo, factory);

            const result = await service.create(CREATOR_ID, {
                quartierId: "quartier-uuid",
                title: "Which day?",
                type: "single_choice",
                options: [{ label: "Monday" }, { label: "Tuesday" }],
                durationMinutes: 120,
            });

            expect(result.options).toHaveLength(2);
            expect(result.options[0].label).toBe("Monday");
            expect(result.options.every((o) => o.votesCount === 0)).toBe(true);
            expect(result.options.every((o) => typeof o.id === "string")).toBe(
                true,
            );
        });

        it("sets startedAt to now and endsAt to now + durationMinutes", async () => {
            const insertOne = jest
                .fn()
                .mockResolvedValue({ insertedId: new ObjectId(VOTE_ID) });
            mongo.collection = jest.fn().mockReturnValue({ insertOne });
            service = new VotesService(mongo, factory);

            const before = Date.now();
            const result = await service.create(CREATOR_ID, {
                quartierId: "q-uuid",
                title: "Test vote",
                type: "binary",
                options: [],
                durationMinutes: 30,
            });
            const after = Date.now();

            const startedAt = result.startedAt.getTime();
            const endsAt = result.endsAt.getTime();
            expect(startedAt).toBeGreaterThanOrEqual(before);
            expect(startedAt).toBeLessThanOrEqual(after);
            expect(endsAt - startedAt).toBeCloseTo(30 * 60 * 1000, -3);
        });
    });

    describe("respond", () => {
        it("successfully records a vote response", async () => {
            const collectionMocks: Record<string, unknown> = {};
            mongo.collection = jest.fn().mockImplementation((name: string) => {
                if (name === "votes") {
                    return {
                        findOne: jest.fn().mockResolvedValue(binaryVote),
                        updateOne: jest
                            .fn()
                            .mockResolvedValue({ modifiedCount: 1 }),
                    };
                }
                return {
                    findOne: jest.fn().mockResolvedValue(null),
                    insertOne: jest
                        .fn()
                        .mockResolvedValue({ insertedId: new ObjectId() }),
                };
            });
            service = new VotesService(mongo, factory);

            const result = await service.respond(VOTE_ID, VOTER_ID, {
                selectedOptions: ["yes"],
            });

            expect(result.selectedOptions).toEqual(["yes"]);
        });

        it("throws BadRequestException when vote has expired", async () => {
            mongo.collection = jest.fn().mockReturnValue({
                findOne: jest.fn().mockResolvedValue(expiredVote),
            });
            service = new VotesService(mongo, factory);

            await expect(
                service.respond(VOTE_ID, VOTER_ID, {
                    selectedOptions: ["yes"],
                }),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it("throws ConflictException when user has already voted", async () => {
            const existingResponse = {
                voteId: VOTE_ID,
                userId: VOTER_ID,
                selectedOptions: ["yes"],
                respondedAt: new Date(),
            };

            mongo.collection = jest.fn().mockImplementation((name: string) => {
                if (name === "votes") {
                    return { findOne: jest.fn().mockResolvedValue(binaryVote) };
                }
                return {
                    findOne: jest.fn().mockResolvedValue(existingResponse),
                };
            });
            service = new VotesService(mongo, factory);

            await expect(
                service.respond(VOTE_ID, VOTER_ID, {
                    selectedOptions: ["yes"],
                }),
            ).rejects.toBeInstanceOf(ConflictException);
        });

        it("throws BadRequestException when response is invalid according to strategy", async () => {
            mongo.collection = jest.fn().mockImplementation((name: string) => {
                if (name === "votes") {
                    return { findOne: jest.fn().mockResolvedValue(binaryVote) };
                }
                return { findOne: jest.fn().mockResolvedValue(null) };
            });
            service = new VotesService(mongo, factory);

            await expect(
                service.respond(VOTE_ID, VOTER_ID, {
                    selectedOptions: ["yes", "no"],
                }),
            ).rejects.toBeInstanceOf(BadRequestException);
        });
    });

    describe("getResults", () => {
        it("throws ForbiddenException when showResults=false and vote is still active", async () => {
            mongo.collection = jest.fn().mockReturnValue({
                findOne: jest.fn().mockResolvedValue(hiddenResultsVote),
            });
            service = new VotesService(mongo, factory);

            await expect(
                service.getResults(VOTE_ID, VOTER_ID),
            ).rejects.toBeInstanceOf(ForbiddenException);
        });

        it("returns results after vote has ended regardless of showResults", async () => {
            const endedHiddenVote = { ...hiddenResultsVote, endsAt: pastDate };

            mongo.collection = jest.fn().mockImplementation((name: string) => {
                if (name === "votes") {
                    return {
                        findOne: jest.fn().mockResolvedValue(endedHiddenVote),
                    };
                }
                return {
                    find: jest.fn().mockReturnValue({
                        toArray: jest.fn().mockResolvedValue([]),
                    }),
                };
            });
            service = new VotesService(mongo, factory);

            const result = await service.getResults(VOTE_ID, VOTER_ID);
            expect(result).toHaveProperty("results");
            expect(result.participationCount).toBe(0);
        });

        it("returns results when showResults=true even if vote is active", async () => {
            const activeVote = { ...binaryVote, showResults: true };
            const responses = [
                {
                    voteId: VOTE_ID,
                    userId: "u1",
                    selectedOptions: ["yes"],
                    respondedAt: new Date(),
                },
            ];

            mongo.collection = jest.fn().mockImplementation((name: string) => {
                if (name === "votes") {
                    return { findOne: jest.fn().mockResolvedValue(activeVote) };
                }
                return {
                    find: jest.fn().mockReturnValue({
                        toArray: jest.fn().mockResolvedValue(responses),
                    }),
                };
            });
            service = new VotesService(mongo, factory);

            const result = await service.getResults(VOTE_ID, VOTER_ID);
            expect(result.participationCount).toBe(1);
        });
    });
});

describe("BinaryStrategy", () => {
    const strategy = new BinaryStrategy();
    const emptyOptions: VoteOption[] = [];

    it("accepts valid 'yes' response", () => {
        expect(() =>
            strategy.validateResponse(emptyOptions, ["yes"]),
        ).not.toThrow();
    });

    it("accepts valid 'no' response", () => {
        expect(() =>
            strategy.validateResponse(emptyOptions, ["no"]),
        ).not.toThrow();
    });

    it("throws BadRequestException for multiple selections", () => {
        expect(() =>
            strategy.validateResponse(emptyOptions, ["yes", "no"]),
        ).toThrow(BadRequestException);
    });

    it("throws BadRequestException for invalid option value", () => {
        expect(() =>
            strategy.validateResponse(emptyOptions, ["maybe"]),
        ).toThrow(BadRequestException);
    });

    it("throws BadRequestException for empty selection", () => {
        expect(() => strategy.validateResponse(emptyOptions, [])).toThrow(
            BadRequestException,
        );
    });

    it("counts yes and no correctly", () => {
        const responses = [
            {
                selectedOptions: ["yes"],
                voteId: "v1",
                userId: "u1",
                respondedAt: new Date(),
            },
            {
                selectedOptions: ["yes"],
                voteId: "v1",
                userId: "u2",
                respondedAt: new Date(),
            },
            {
                selectedOptions: ["no"],
                voteId: "v1",
                userId: "u3",
                respondedAt: new Date(),
            },
        ];

        const results = strategy.calculateResults(responses);
        expect(results.yes).toBe(2);
        expect(results.no).toBe(1);
    });
});

describe("WeightedStrategy", () => {
    const strategy = new WeightedStrategy();
    const options: VoteOption[] = [
        { id: "opt-a", label: "Option A", votesCount: 0 },
        { id: "opt-b", label: "Option B", votesCount: 0 },
    ];

    it("accepts valid weighted values summing to <= 100", () => {
        expect(() =>
            strategy.validateResponse(options, [], {
                "opt-a": 60,
                "opt-b": 40,
            }),
        ).not.toThrow();
    });

    it("throws BadRequestException when sum exceeds 100", () => {
        expect(() =>
            strategy.validateResponse(options, [], {
                "opt-a": 60,
                "opt-b": 50,
            }),
        ).toThrow(BadRequestException);
    });

    it("throws BadRequestException when weightedValues is not provided", () => {
        expect(() => strategy.validateResponse(options, [], undefined)).toThrow(
            BadRequestException,
        );
    });

    it("throws BadRequestException for unknown option key", () => {
        expect(() =>
            strategy.validateResponse(options, [], { "unknown-id": 50 }),
        ).toThrow(BadRequestException);
    });

    it("sums weighted values per option across all responses", () => {
        const responses = [
            {
                voteId: "v1",
                userId: "u1",
                selectedOptions: [],
                weightedValues: { "opt-a": 70, "opt-b": 30 },
                respondedAt: new Date(),
            },
            {
                voteId: "v1",
                userId: "u2",
                selectedOptions: [],
                weightedValues: { "opt-a": 40, "opt-b": 60 },
                respondedAt: new Date(),
            },
        ];

        const results = strategy.calculateResults(responses);
        expect(results["opt-a"]).toBe(110);
        expect(results["opt-b"]).toBe(90);
    });
});
