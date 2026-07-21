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

const castBy = (userId: string, choices: string[] = ["yes"]): CastRecord => ({
    userId,
    choices,
    castAt: new Date(),
});

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
    toObject: jest.Mock;
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
    toObject: jest.fn(),
};

const anonymousVoteWith = (casts: CastRecord[]) => {
    const vote = {
        ...mockVote,
        isAnonymous: true,
        casts,
        save: jest.fn(),
        toObject: jest.fn(),
    };
    vote.toObject.mockImplementation(() => ({ ...vote, casts: [...casts] }));
    return vote;
};

const queryResolving = <T>(result: T) => ({
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(result),
});

const mockModel = {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    findOneAndUpdate: jest.fn(),
    countDocuments: jest.fn().mockResolvedValue(1),
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
        // Spread copies of mockVote share this jest.fn: resolve via `this` so
        // each copy serializes its own casts.
        mockVote.toObject.mockImplementation(function (this: typeof mockVote) {
            return { ...this, casts: [...this.casts] };
        });
        mockModel.find.mockReturnValue(queryResolving([mockVote]));
        mockModel.findById.mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockVote),
        });
        mockModel.findOneAndUpdate.mockReturnValue({
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

    it("casts a vote successfully through an atomic update", async () => {
        const updatedVote = { ...mockVote, casts: [castBy("user1")] };
        mockModel.findOneAndUpdate.mockReturnValue({
            exec: jest.fn().mockResolvedValue(updatedVote),
        });

        const result = await service.cast(
            "vote1",
            { choices: ["yes"] },
            "user1",
        );

        expect(result.casts).toHaveLength(1);
        expect(result.casts[0].userId).toBe("user1");
    });

    it("guards the atomic cast update with status, deadline and duplicate filters", async () => {
        await service.cast("vote1", { choices: ["yes"] }, "user1");

        expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
            {
                _id: "vote1",
                status: "open",
                endsAt: { $gt: expect.any(Date) },
                "casts.userId": { $ne: "user1" },
            },
            {
                $push: {
                    casts: expect.objectContaining({
                        userId: "user1",
                        choices: ["yes"],
                    }),
                },
            },
            { new: true },
        );
    });

    it("rejects duplicate vote", async () => {
        mockVote.casts = [castBy("user1")];
        await expect(
            service.cast("vote1", { choices: ["yes"] }, "user1"),
        ).rejects.toThrow(ConflictException);
        expect(mockModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it("rejects vote on closed ballot", async () => {
        const closedVote = { ...mockVote, status: "closed", save: jest.fn() };
        mockModel.findById.mockReturnValue({
            exec: jest.fn().mockResolvedValue(closedVote),
        });
        await expect(
            service.cast("vote1", { choices: ["yes"] }, "user2"),
        ).rejects.toThrow(BadRequestException);
        expect(mockModel.findOneAndUpdate).not.toHaveBeenCalled();
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

    it("rejects weighted votes whose weight keys are not vote options", async () => {
        const weightedVote = {
            ...mockVote,
            voteType: CommunityVoteType.WEIGHTED,
            save: jest.fn(),
        };
        mockModel.findById.mockReturnValue({
            exec: jest.fn().mockResolvedValue(weightedVote),
        });

        const attempt = service.cast(
            "vote1",
            { choices: ["yes"], weights: { ghost: 999 } },
            "user2",
        );

        await expect(attempt).rejects.toThrow(BadRequestException);
        await expect(attempt).rejects.toThrow("Invalid options: ghost");
        expect(mockModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it("throws ConflictException when a concurrent cast wins the atomic update", async () => {
        mockModel.findOneAndUpdate.mockReturnValue({
            exec: jest.fn().mockResolvedValue(null),
        });
        mockModel.findById
            .mockReturnValueOnce({
                exec: jest.fn().mockResolvedValue(mockVote),
            })
            .mockReturnValueOnce({
                exec: jest.fn().mockResolvedValue({
                    ...mockVote,
                    casts: [castBy("user1")],
                }),
            });

        const casting = service.cast("vote1", { choices: ["yes"] }, "user1");

        await expect(casting).rejects.toThrow(ConflictException);
        await expect(casting).rejects.toThrow("You have already voted");
    });

    it("throws NotFoundException when the vote disappears during the atomic update", async () => {
        mockModel.findOneAndUpdate.mockReturnValue({
            exec: jest.fn().mockResolvedValue(null),
        });
        mockModel.findById
            .mockReturnValueOnce({
                exec: jest.fn().mockResolvedValue(mockVote),
            })
            .mockReturnValueOnce({
                exec: jest.fn().mockResolvedValue(null),
            });

        const casting = service.cast("vote1", { choices: ["yes"] }, "user1");

        await expect(casting).rejects.toThrow(NotFoundException);
        await expect(casting).rejects.toThrow("Vote not found");
    });

    it("throws BadRequestException when the vote closes during the atomic update", async () => {
        mockModel.findOneAndUpdate.mockReturnValue({
            exec: jest.fn().mockResolvedValue(null),
        });
        mockModel.findById
            .mockReturnValueOnce({
                exec: jest.fn().mockResolvedValue(mockVote),
            })
            .mockReturnValueOnce({
                exec: jest.fn().mockResolvedValue({
                    ...mockVote,
                    status: "closed",
                }),
            });

        const casting = service.cast("vote1", { choices: ["yes"] }, "user1");

        await expect(casting).rejects.toThrow(BadRequestException);
        await expect(casting).rejects.toThrow("This vote has ended");
    });

    it("returns only the caster's ballot after casting on an anonymous vote", async () => {
        mockModel.findById.mockReturnValue({
            exec: jest.fn().mockResolvedValue(anonymousVoteWith([])),
        });
        mockModel.findOneAndUpdate.mockReturnValue({
            exec: jest
                .fn()
                .mockResolvedValue(
                    anonymousVoteWith([castBy("user1"), castBy("other-user")]),
                ),
        });

        const result = await service.cast(
            "vote1",
            { choices: ["yes"] },
            "user1",
        );

        expect(result.casts).toHaveLength(1);
        expect(result.casts[0].userId).toBe("user1");
    });

    it("reports the true participant count on anonymous votes while hiding ballots", async () => {
        const anonymousVote = anonymousVoteWith([
            castBy("user1"),
            castBy("other-user"),
        ]);
        mockModel.find.mockReturnValue(queryResolving([anonymousVote]));

        const { rows } = await service.findAllFor("user1");

        expect((rows[0] as { participantCount: number }).participantCount).toBe(
            2,
        );
        expect(rows[0].casts).toHaveLength(1);
    });

    it("reports the participant count on non-anonymous votes too", async () => {
        mockVote.casts = [castBy("user1")];

        const { rows } = await service.findAllFor("someone-else");

        expect((rows[0] as { participantCount: number }).participantCount).toBe(
            1,
        );
        expect(rows[0].casts).toHaveLength(1);
    });

    it("hides other voters' ballots on anonymous votes in findAllFor", async () => {
        const anonymousVote = anonymousVoteWith([
            castBy("user1"),
            castBy("other-user"),
        ]);
        mockModel.find.mockReturnValue(queryResolving([anonymousVote]));

        const { rows } = await service.findAllFor("user1");
        const [vote] = rows;

        expect(vote.casts).toHaveLength(1);
        expect(vote.casts.map((c) => c.userId)).toEqual(["user1"]);
    });

    it("keeps all casts visible on non-anonymous votes in findAllFor", async () => {
        const publicVote = {
            ...mockVote,
            casts: [castBy("user1"), castBy("other-user")],
        };
        mockModel.find.mockReturnValue(queryResolving([publicVote]));

        const { rows } = await service.findAllFor("user1");
        const [vote] = rows;

        expect(vote.casts).toHaveLength(2);
        expect(vote.casts.map((c) => c.userId)).toEqual([
            "user1",
            "other-user",
        ]);
    });

    it("hides other voters' ballots on anonymous votes in findOneFor", async () => {
        mockModel.findById.mockReturnValue({
            exec: jest
                .fn()
                .mockResolvedValue(
                    anonymousVoteWith([castBy("user1"), castBy("other-user")]),
                ),
        });

        const vote = await service.findOneFor("vote1", "user1");

        expect(vote.casts.map((c) => c.userId)).toEqual(["user1"]);
    });

    it("sums weighted votes stored as a Mongoose Map", async () => {
        mockVote.voteType = CommunityVoteType.WEIGHTED;
        mockVote.casts = [
            {
                userId: "u1",
                choices: ["yes"],
                weights: new Map([
                    ["yes", 3],
                    ["no", 1],
                ]),
                castAt: new Date(),
            },
            {
                userId: "u2",
                choices: ["no"],
                weights: new Map([["no", 2]]),
                castAt: new Date(),
            },
        ];

        const results = await service.getResults("vote1");
        const totals = results.totals as Record<string, number>;

        expect(totals["yes"]).toBe(3);
        expect(totals["no"]).toBe(3);
        // Mongoose Maps carry internal keys that must never reach the payload.
        expect(Object.keys(totals).sort()).toEqual(["no", "yes"]);
        mockVote.voteType = CommunityVoteType.BINARY;
    });

    it("ignores weight keys that are not vote options", async () => {
        mockVote.voteType = CommunityVoteType.WEIGHTED;
        mockVote.casts = [
            {
                userId: "u1",
                choices: ["yes"],
                weights: new Map<string, number>([
                    ["yes", 2],
                    ["ghost", 99],
                ]),
                castAt: new Date(),
            },
        ];

        const results = await service.getResults("vote1");
        const totals = results.totals as Record<string, number>;

        expect(totals["yes"]).toBe(2);
        expect(totals["ghost"]).toBeUndefined();
        mockVote.voteType = CommunityVoteType.BINARY;
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
