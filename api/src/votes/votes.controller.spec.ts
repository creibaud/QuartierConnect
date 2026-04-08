import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { VoteTargetType } from "./schemas/vote.schema";
import { VotesController } from "./votes.controller";
import { VotesService } from "./votes.service";

const mockService = {
    cast: jest.fn(),
    getScore: jest.fn(),
};

describe("VotesController", () => {
    let controller: VotesController;

    beforeEach(async () => {
        jest.clearAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            controllers: [VotesController],
            providers: [{ provide: VotesService, useValue: mockService }],
        }).compile();

        controller = module.get<VotesController>(VotesController);
    });

    const req = { user: { sub: "user-1" } };

    it("cast adds a like vote on service", async () => {
        mockService.cast.mockResolvedValue({
            action: "added",
            voteType: "like",
        });
        const dto = {
            targetType: VoteTargetType.SERVICE,
            targetId: "svc-1",
            voteType: "like" as any,
        };
        const result = await controller.cast(dto, req as any);
        expect(result.action).toBe("added");
    });

    it("cast toggles vote (removes) when same type", async () => {
        mockService.cast.mockResolvedValue({
            action: "removed",
            voteType: "like",
        });
        const dto = {
            targetType: VoteTargetType.SERVICE,
            targetId: "svc-1",
            voteType: "like" as any,
        };
        const result = await controller.cast(dto, req as any);
        expect(result.action).toBe("removed");
    });

    it("cast throws 400 when vote type not allowed for target", async () => {
        mockService.cast.mockRejectedValue(
            new BadRequestException("VoteType like not allowed for incident"),
        );
        const dto = {
            targetType: VoteTargetType.INCIDENT,
            targetId: "inc-1",
            voteType: "like" as any,
        };
        await expect(controller.cast(dto, req as any)).rejects.toThrow(
            BadRequestException,
        );
    });

    it("getScore returns LikeDislike score for service", async () => {
        mockService.getScore.mockResolvedValue({
            score: 3,
            breakdown: { like: 5, dislike: 2 },
        });
        const result = await controller.getScore(
            "svc-1",
            VoteTargetType.SERVICE,
        );
        expect(result.score).toBe(3);
        expect(result.breakdown.like).toBe(5);
    });

    it("getScore returns UpDown score for incident", async () => {
        mockService.getScore.mockResolvedValue({
            score: -1,
            breakdown: { up: 2, down: 3 },
        });
        const result = await controller.getScore(
            "inc-1",
            VoteTargetType.INCIDENT,
        );
        expect(result.score).toBe(-1);
        expect(result.breakdown.up).toBe(2);
    });
});

describe("VoteStrategy unit tests", () => {
    it("LikeDislikeStrategy calculates correctly", () => {
        const {
            LikeDislikeStrategy,
        } = require("./strategies/like-dislike.strategy");
        const strategy = new LikeDislikeStrategy();
        const result = strategy.calculate([
            { voteType: "like" },
            { voteType: "like" },
            { voteType: "dislike" },
        ]);
        expect(result.score).toBe(1);
        expect(result.breakdown.like).toBe(2);
        expect(result.breakdown.dislike).toBe(1);
    });

    it("UpDownStrategy calculates correctly", () => {
        const { UpDownStrategy } = require("./strategies/updown.strategy");
        const strategy = new UpDownStrategy();
        const result = strategy.calculate([
            { voteType: "up" },
            { voteType: "down" },
            { voteType: "down" },
        ]);
        expect(result.score).toBe(-1);
        expect(result.breakdown.up).toBe(1);
        expect(result.breakdown.down).toBe(2);
    });

    it("factory returns LikeDislike for SERVICE", () => {
        const {
            getVoteStrategy,
        } = require("./strategies/vote-strategy.factory");
        const {
            LikeDislikeStrategy,
        } = require("./strategies/like-dislike.strategy");
        expect(getVoteStrategy(VoteTargetType.SERVICE)).toBeInstanceOf(
            LikeDislikeStrategy,
        );
    });

    it("factory returns UpDown for INCIDENT", () => {
        const {
            getVoteStrategy,
        } = require("./strategies/vote-strategy.factory");
        const { UpDownStrategy } = require("./strategies/updown.strategy");
        expect(getVoteStrategy(VoteTargetType.INCIDENT)).toBeInstanceOf(
            UpDownStrategy,
        );
    });
});
