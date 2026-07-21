import {
    BadRequestException,
    ForbiddenException,
    NotFoundException,
} from "@nestjs/common";
import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { DRIZZLE_TOKEN } from "../database/drizzle.module";
import { Event } from "../events/schemas/event.schema";
import { Service } from "../services/schemas/service.schema";
import { Vote, VoteTargetType } from "./schemas/vote.schema";
import { VotesService } from "./votes.service";

const SERVICE_OID = "664f1a2b3c4d5e6f7a8b9c0d";
const INCIDENT_ID = "inc-uuid-1";

const mockVote = {
    deleteOne: jest.fn(),
    set: jest.fn(),
    save: jest.fn(),
    voteType: "like",
};

const mockVoteModel = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    aggregate: jest.fn(),
};

function targetLookup(target: { neighborhoodId?: string | null } | null) {
    return {
        findById: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue(target),
            }),
        }),
    };
}

function incidentLookup(rows: { neighborhoodId: string | null }[]) {
    return {
        select: jest.fn().mockReturnValue({
            from: jest.fn().mockReturnValue({
                where: jest.fn().mockReturnValue({
                    limit: jest.fn().mockResolvedValue(rows),
                }),
            }),
        }),
    };
}

const voter = (over: Record<string, unknown> = {}) => ({
    sub: "user-1",
    role: "resident",
    neighborhoodId: null,
    ...over,
});

describe("VotesService", () => {
    let service: VotesService;
    let mockServiceModel: ReturnType<typeof targetLookup>;
    let mockEventModel: ReturnType<typeof targetLookup>;
    let mockDb: ReturnType<typeof incidentLookup>;

    async function compile() {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                VotesService,
                { provide: getModelToken(Vote.name), useValue: mockVoteModel },
                {
                    provide: getModelToken(Service.name),
                    useValue: mockServiceModel,
                },
                {
                    provide: getModelToken(Event.name),
                    useValue: mockEventModel,
                },
                { provide: DRIZZLE_TOKEN, useValue: mockDb },
            ],
        }).compile();

        service = module.get<VotesService>(VotesService);
    }

    beforeEach(async () => {
        jest.clearAllMocks();
        mockServiceModel = targetLookup({ neighborhoodId: null });
        mockEventModel = targetLookup({ neighborhoodId: null });
        mockDb = incidentLookup([{ neighborhoodId: null }]);
        await compile();
    });

    describe("cast", () => {
        const dto = {
            targetId: SERVICE_OID,
            targetType: VoteTargetType.SERVICE,
            voteType: "like" as any,
        };

        it("adds a new vote when none exists", async () => {
            mockVoteModel.findOne.mockReturnValue({
                exec: jest.fn().mockResolvedValue(null),
            });
            mockVoteModel.create.mockResolvedValue({});

            const result = await service.cast(dto, voter());
            expect(result.action).toBe("added");
            expect(result.voteType).toBe("like");
            expect(mockVoteModel.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: "user-1",
                    targetId: SERVICE_OID,
                    voteType: "like",
                }),
            );
        });

        it("removes vote when same type cast again (toggle)", async () => {
            const existing = {
                ...mockVote,
                voteType: "like",
                deleteOne: jest.fn().mockResolvedValue({}),
            };
            mockVoteModel.findOne.mockReturnValue({
                exec: jest.fn().mockResolvedValue(existing),
            });

            const result = await service.cast(dto, voter());
            expect(result.action).toBe("removed");
            expect(existing.deleteOne).toHaveBeenCalled();
        });

        it("changes vote when different type cast", async () => {
            const existing = {
                voteType: "like",
                set: jest.fn(),
                save: jest.fn().mockResolvedValue({}),
            };
            mockVoteModel.findOne.mockReturnValue({
                exec: jest.fn().mockResolvedValue(existing),
            });

            const result = await service.cast(
                { ...dto, voteType: "dislike" as any },
                voter(),
            );
            expect(result.action).toBe("changed");
            expect(result.voteType).toBe("dislike");
            expect(existing.set).toHaveBeenCalledWith("voteType", "dislike");
            expect(existing.save).toHaveBeenCalled();
        });

        it("throws 400 when voteType not allowed for targetType", async () => {
            const incidentDto = {
                targetId: "inc-1",
                targetType: VoteTargetType.INCIDENT,
                voteType: "like" as any,
            };
            await expect(service.cast(incidentDto, voter())).rejects.toThrow(
                BadRequestException,
            );
        });

        it("throws 404 when the target service does not exist", async () => {
            mockServiceModel = targetLookup(null);
            await compile();

            await expect(service.cast(dto, voter())).rejects.toThrow(
                NotFoundException,
            );
            expect(mockVoteModel.create).not.toHaveBeenCalled();
        });

        it("throws 404 for a malformed Mongo target id", async () => {
            await expect(
                service.cast({ ...dto, targetId: "svc-1" }, voter()),
            ).rejects.toThrow(NotFoundException);
        });

        it("denies voting on a service from another quartier", async () => {
            mockServiceModel = targetLookup({ neighborhoodId: "nB" });
            await compile();

            await expect(
                service.cast(dto, voter({ neighborhoodId: "nA" })),
            ).rejects.toThrow(ForbiddenException);
            expect(mockVoteModel.create).not.toHaveBeenCalled();
        });

        it("lets an admin vote on a target outside their quartier", async () => {
            mockServiceModel = targetLookup({ neighborhoodId: "nB" });
            await compile();
            mockVoteModel.findOne.mockReturnValue({
                exec: jest.fn().mockResolvedValue(null),
            });
            mockVoteModel.create.mockResolvedValue({});

            const result = await service.cast(
                dto,
                voter({ sub: "adm", role: "admin", neighborhoodId: "nA" }),
            );
            expect(result.action).toBe("added");
        });

        it("throws 404 when the target incident does not exist", async () => {
            mockDb = incidentLookup([]);
            await compile();

            await expect(
                service.cast(
                    {
                        targetId: INCIDENT_ID,
                        targetType: VoteTargetType.INCIDENT,
                        voteType: "up" as any,
                    },
                    voter(),
                ),
            ).rejects.toThrow(NotFoundException);
        });

        it("rejects an unsupported target type outright", async () => {
            await expect(
                service.cast(
                    {
                        targetId: SERVICE_OID,
                        targetType: "comment" as any,
                        voteType: "up" as any,
                    },
                    voter(),
                ),
            ).rejects.toThrow(BadRequestException);
        });
    });

    const aggregateResolving = <T>(rows: T) => ({
        exec: jest.fn().mockResolvedValue(rows),
    });

    describe("getScore", () => {
        it("returns LikeDislike score for SERVICE", async () => {
            mockVoteModel.aggregate.mockReturnValue(
                aggregateResolving([
                    { _id: "like", count: 2 },
                    { _id: "dislike", count: 1 },
                ]),
            );

            const result = await service.getScore(
                "svc-1",
                VoteTargetType.SERVICE,
            );
            expect(result.score).toBe(1);
            expect((result.breakdown as any).like).toBe(2);
            expect((result.breakdown as any).dislike).toBe(1);
        });

        it("returns UpDown score for INCIDENT", async () => {
            mockVoteModel.aggregate.mockReturnValue(
                aggregateResolving([
                    { _id: "up", count: 1 },
                    { _id: "down", count: 2 },
                ]),
            );

            const result = await service.getScore(
                "inc-1",
                VoteTargetType.INCIDENT,
            );
            expect(result.score).toBe(-1);
            expect((result.breakdown as any).up).toBe(1);
            expect((result.breakdown as any).down).toBe(2);
        });

        it("returns zero score for no votes", async () => {
            mockVoteModel.aggregate.mockReturnValue(aggregateResolving([]));

            const result = await service.getScore(
                "svc-2",
                VoteTargetType.SERVICE,
            );
            expect(result.score).toBe(0);
        });
    });

    describe("cast double-submit", () => {
        const castDto = {
            targetId: SERVICE_OID,
            targetType: VoteTargetType.SERVICE,
            voteType: "like" as any,
        };

        it("treats a duplicate-key race as the same idempotent added result", async () => {
            mockVoteModel.findOne.mockReturnValue({
                exec: jest.fn().mockResolvedValue(null),
            });
            mockVoteModel.create.mockRejectedValue({ code: 11000 });

            const result = await service.cast(castDto, voter());
            expect(result.action).toBe("added");
        });

        it("rethrows a non-duplicate create error", async () => {
            mockVoteModel.findOne.mockReturnValue({
                exec: jest.fn().mockResolvedValue(null),
            });
            mockVoteModel.create.mockRejectedValue(new Error("db down"));

            await expect(service.cast(castDto, voter())).rejects.toThrow(
                "db down",
            );
        });
    });
});
