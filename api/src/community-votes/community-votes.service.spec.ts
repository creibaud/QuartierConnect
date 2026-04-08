import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    NotFoundException,
} from "@nestjs/common";
import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { CommunityVotesService } from "./community-votes.service";
import {
    CommunityVote,
    CommunityVoteType,
    type CastRecord,
} from "./schemas/community-vote.schema";

const futureDate = new Date(Date.now() + 86400000).toISOString();

const mockVote: {
    _id: string;
    title: string;
    voteType: CommunityVoteType;
    options: { id: string; label: string }[];
    casts: CastRecord[];
    status: string;
    endsAt: Date;
    quorum: number;
    isAnonymous: boolean;
    createdBy: string;
    save: jest.Mock;
} = {
    _id: "vote1",
    title: "Test vote",
    voteType: CommunityVoteType.BINARY,
    createdBy: "user1-creator",
    options: [
        { id: "yes", label: "Oui" },
        { id: "no", label: "Non" },
    ],
    casts: [],
    status: "open",
    endsAt: new Date(Date.now() + 86400000),
    quorum: 0,
    isAnonymous: false,
    save: jest.fn().mockResolvedValue(undefined),
};

const mockModel = {
    create: jest.fn(),
    find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockVote]),
    }),
    findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockVote),
    }),
};

describe("CommunityVotesService", () => {
    let service: CommunityVotesService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CommunityVotesService,
                {
                    provide: getModelToken(CommunityVote.name),
                    useValue: mockModel,
                },
            ],
        }).compile();

        service = module.get<CommunityVotesService>(CommunityVotesService);
        jest.clearAllMocks();
        mockVote.casts = [];
        mockVote.status = "open";
        mockModel.findById.mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockVote),
        });
    });

    it("creates a vote", async () => {
        mockModel.create.mockResolvedValue(mockVote);
        const dto = {
            title: "Test",
            voteType: CommunityVoteType.BINARY,
            options: [
                { id: "yes", label: "Oui" },
                { id: "no", label: "Non" },
            ],
            endsAt: futureDate,
        };
        const result = await service.create(dto, "user1");
        expect(mockModel.create).toHaveBeenCalled();
        expect(result).toBeDefined();
    });

    it("throws NotFoundException for unknown vote", async () => {
        mockModel.findById.mockReturnValue({
            exec: jest.fn().mockResolvedValue(null),
        });
        await expect(service.findOne("unknown")).rejects.toThrow(
            NotFoundException,
        );
    });

    it("casts a vote successfully", async () => {
        mockVote.save.mockResolvedValue(mockVote);
        await service.cast("vote1", { choices: ["yes"] }, "user1");
        expect(mockVote.casts).toHaveLength(1);
        expect(mockVote.casts[0].userId).toBe("user1");
    });

    it("rejects duplicate vote", async () => {
        mockVote.casts = [
            { userId: "user1", choices: ["yes"], castAt: new Date() },
        ];
        await expect(
            service.cast("vote1", { choices: ["yes"] }, "user1"),
        ).rejects.toThrow(ConflictException);
    });

    it("rejects vote on closed ballot", async () => {
        const closedVote = { ...mockVote, status: "closed", save: jest.fn() };
        mockModel.findById.mockReturnValue({
            exec: jest.fn().mockResolvedValue(closedVote),
        });
        await expect(
            service.cast("vote1", { choices: ["yes"] }, "user2"),
        ).rejects.toThrow(BadRequestException);
    });

    it("rejects binary vote with multiple choices", async () => {
        await expect(
            service.cast("vote1", { choices: ["yes", "no"] }, "user2"),
        ).rejects.toThrow(BadRequestException);
    });

    it("rejects invalid option id", async () => {
        await expect(
            service.cast("vote1", { choices: ["maybe"] }, "user2"),
        ).rejects.toThrow(BadRequestException);
    });

    it("calculates binary vote results", async () => {
        mockVote.casts = [
            { userId: "u1", choices: ["yes"], castAt: new Date() },
            { userId: "u2", choices: ["no"], castAt: new Date() },
            { userId: "u3", choices: ["yes"], castAt: new Date() },
        ];
        const results = await service.getResults("vote1");
        expect((results.totals as Record<string, number>)["yes"]).toBe(2);
        expect((results.totals as Record<string, number>)["no"]).toBe(1);
        expect(results.totalParticipants).toBe(3);
    });

    it("quorum reached when casts >= quorum threshold", async () => {
        const voteWithQuorum = {
            ...mockVote,
            quorum: 2,
            casts: [
                { userId: "u1", choices: ["yes"], castAt: new Date() },
                { userId: "u2", choices: ["no"], castAt: new Date() },
            ],
            save: jest.fn(),
        };
        mockModel.findById.mockReturnValue({
            exec: jest.fn().mockResolvedValue(voteWithQuorum),
        });
        const results = await service.getResults("vote1");
        expect(results.quorumReached).toBe(true);
    });

    it("quorum not reached when casts < quorum threshold", async () => {
        const voteWithQuorum = {
            ...mockVote,
            quorum: 5,
            casts: [{ userId: "u1", choices: ["yes"], castAt: new Date() }],
            save: jest.fn(),
        };
        mockModel.findById.mockReturnValue({
            exec: jest.fn().mockResolvedValue(voteWithQuorum),
        });
        const results = await service.getResults("vote1");
        expect(results.quorumReached).toBe(false);
    });

    it("throws ForbiddenException when non-creator tries to close", async () => {
        await expect(
            service.close("vote1", "other-user", "resident"),
        ).rejects.toThrow(ForbiddenException);
    });

    it("allows creator to close their own vote", async () => {
        mockVote.save.mockResolvedValue({ ...mockVote, status: "closed" });
        const result = await service.close(
            "vote1",
            "user1-creator",
            "resident",
        );
        expect(result.status).toBe("closed");
    });

    it("allows admin to close any vote", async () => {
        mockVote.save.mockResolvedValue({ ...mockVote, status: "closed" });
        const result = await service.close("vote1", "admin-user", "admin");
        expect(result.status).toBe("closed");
    });
});
