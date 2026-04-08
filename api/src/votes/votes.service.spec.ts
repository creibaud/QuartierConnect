import { BadRequestException } from "@nestjs/common";
import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { Vote, VoteTargetType } from "./schemas/vote.schema";
import { VotesService } from "./votes.service";

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
};

describe("VotesService", () => {
    let service: VotesService;

    beforeEach(async () => {
        jest.clearAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                VotesService,
                { provide: getModelToken(Vote.name), useValue: mockVoteModel },
            ],
        }).compile();

        service = module.get<VotesService>(VotesService);
    });

    describe("cast", () => {
        const dto = {
            targetId: "svc-1",
            targetType: VoteTargetType.SERVICE,
            voteType: "like" as any,
        };

        it("adds a new vote when none exists", async () => {
            mockVoteModel.findOne.mockReturnValue({
                exec: jest.fn().mockResolvedValue(null),
            });
            mockVoteModel.create.mockResolvedValue({});

            const result = await service.cast(dto, "user-1");
            expect(result.action).toBe("added");
            expect(result.voteType).toBe("like");
            expect(mockVoteModel.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: "user-1",
                    targetId: "svc-1",
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

            const result = await service.cast(dto, "user-1");
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
                "user-1",
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
            await expect(service.cast(incidentDto, "user-1")).rejects.toThrow(
                BadRequestException,
            );
        });
    });

    describe("getScore", () => {
        it("returns LikeDislike score for SERVICE", async () => {
            mockVoteModel.find.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                lean: jest.fn().mockReturnThis(),
                exec: jest
                    .fn()
                    .mockResolvedValue([
                        { voteType: "like" },
                        { voteType: "like" },
                        { voteType: "dislike" },
                    ]),
            });

            const result = await service.getScore(
                "svc-1",
                VoteTargetType.SERVICE,
            );
            expect(result.score).toBe(1);
            expect((result.breakdown as any).like).toBe(2);
            expect((result.breakdown as any).dislike).toBe(1);
        });

        it("returns UpDown score for INCIDENT", async () => {
            mockVoteModel.find.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                lean: jest.fn().mockReturnThis(),
                exec: jest
                    .fn()
                    .mockResolvedValue([
                        { voteType: "up" },
                        { voteType: "down" },
                        { voteType: "down" },
                    ]),
            });

            const result = await service.getScore(
                "inc-1",
                VoteTargetType.INCIDENT,
            );
            expect(result.score).toBe(-1);
            expect((result.breakdown as any).up).toBe(1);
            expect((result.breakdown as any).down).toBe(2);
        });

        it("returns zero score for no votes", async () => {
            mockVoteModel.find.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                lean: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([]),
            });

            const result = await service.getScore(
                "svc-2",
                VoteTargetType.SERVICE,
            );
            expect(result.score).toBe(0);
        });
    });
});
