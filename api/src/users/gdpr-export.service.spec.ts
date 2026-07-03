import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { User } from "../auth/schemas/user.schema";
import { ServiceBooking } from "../bookings/schemas/service-booking.schema";
import { CommunityVote } from "../community-votes/schemas/community-vote.schema";
import { Contract } from "../contracts/schemas/contract.schema";
import { DRIZZLE_TOKEN } from "../database/drizzle.module";
import { Message } from "../messaging/schemas/message.schema";
import { Service } from "../services/schemas/service.schema";
import { NEO4J_DRIVER } from "../social/neo4j/neo4j.provider";
import { Vote } from "../votes/schemas/vote.schema";
import { GdprExportService } from "./gdpr-export.service";

const USER_ID = "user-1";

const profileRow = {
    id: USER_ID,
    email: "alice@demo.fr",
    role: "resident",
    phone: "+33612345678",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

function queryMock(result: unknown) {
    return {
        sort: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(result),
    };
}

function modelMock() {
    return {
        find: jest.fn().mockReturnValue(queryMock([])),
        findOne: jest.fn().mockReturnValue(queryMock(null)),
    };
}

describe("GdprExportService", () => {
    let service: GdprExportService;
    let db: any;
    let userModel: ReturnType<typeof modelMock>;
    let messageModel: ReturnType<typeof modelMock>;
    let contractModel: ReturnType<typeof modelMock>;
    let bookingModel: ReturnType<typeof modelMock>;
    let voteModel: ReturnType<typeof modelMock>;
    let communityVoteModel: ReturnType<typeof modelMock>;
    let serviceModel: ReturnType<typeof modelMock>;
    let neo4jSession: { run: jest.Mock; close: jest.Mock };

    beforeEach(async () => {
        db = {
            select: jest.fn().mockReturnThis(),
            from: jest.fn().mockReturnThis(),
            where: jest
                .fn()
                .mockResolvedValueOnce([profileRow])
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([]),
        };

        userModel = modelMock();
        messageModel = modelMock();
        contractModel = modelMock();
        bookingModel = modelMock();
        voteModel = modelMock();
        communityVoteModel = modelMock();
        serviceModel = modelMock();

        neo4jSession = {
            run: jest.fn().mockResolvedValue({ records: [] }),
            close: jest.fn().mockResolvedValue(undefined),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GdprExportService,
                { provide: DRIZZLE_TOKEN, useValue: db },
                { provide: getModelToken(User.name), useValue: userModel },
                {
                    provide: getModelToken(Message.name),
                    useValue: messageModel,
                },
                {
                    provide: getModelToken(Contract.name),
                    useValue: contractModel,
                },
                {
                    provide: getModelToken(ServiceBooking.name),
                    useValue: bookingModel,
                },
                { provide: getModelToken(Vote.name), useValue: voteModel },
                {
                    provide: getModelToken(CommunityVote.name),
                    useValue: communityVoteModel,
                },
                {
                    provide: getModelToken(Service.name),
                    useValue: serviceModel,
                },
                {
                    provide: NEO4J_DRIVER,
                    useValue: {
                        session: jest.fn().mockReturnValue(neo4jSession),
                    },
                },
            ],
        }).compile();

        service = module.get<GdprExportService>(GdprExportService);
    });

    it("returns the profile with phone and empty collections", async () => {
        const result = await service.exportUserData(USER_ID);

        expect(result.profile).toEqual(profileRow);
        expect(result.incidents).toEqual([]);
        expect(result.messagesSent).toEqual([]);
        expect(result.contracts).toEqual([]);
        expect(result.bookings).toEqual([]);
        expect(result.votes).toEqual([]);
        expect(result.communityBallots).toEqual([]);
        expect(result.services).toEqual([]);
    });

    it("reads consentTimestamp from the Mongo user document", async () => {
        const consentTimestamp = new Date("2026-02-01T10:00:00.000Z");
        userModel.findOne.mockReturnValue(queryMock({ consentTimestamp }));

        const result = await service.exportUserData(USER_ID);

        expect(userModel.findOne).toHaveBeenCalledWith({
            email: "alice@demo.fr",
        });
        expect(result.consentTimestamp).toEqual(consentTimestamp);
    });

    it("queries messages by senderId only and nulls deleted content", async () => {
        messageModel.find.mockReturnValue(
            queryMock([
                {
                    _id: "msg-1",
                    conversationId: "conv-1",
                    type: "text",
                    content: "hello",
                    fileName: null,
                    deleted: false,
                    createdAt: new Date(),
                },
                {
                    _id: "msg-2",
                    conversationId: "conv-1",
                    type: "text",
                    content: "secret",
                    fileName: null,
                    deleted: true,
                    createdAt: new Date(),
                },
            ]),
        );

        const result = await service.exportUserData(USER_ID);

        expect(messageModel.find).toHaveBeenCalledWith({ senderId: USER_ID });
        expect(result.messagesSent[0].content).toBe("hello");
        expect(result.messagesSent[1].content).toBeNull();
    });

    it("exports contract metadata with timestamped signatures", async () => {
        const signedAt = new Date("2026-03-01T09:00:00.000Z");
        contractModel.find.mockReturnValue(
            queryMock([
                {
                    _id: "contract-1",
                    title: "Gardening",
                    content: "full text that must not leak",
                    status: "fully_signed",
                    createdBy: USER_ID,
                    signatories: [USER_ID, "user-2"],
                    signedAt,
                    signatures: [
                        { userId: USER_ID, signedAt, hash: "h1" },
                        { userId: "user-2", signedAt, hash: "h2" },
                    ],
                    createdAt: new Date(),
                },
            ]),
        );

        const result = await service.exportUserData(USER_ID);

        expect(contractModel.find).toHaveBeenCalledWith({
            $or: [{ createdBy: USER_ID }, { signatories: USER_ID }],
        });
        expect(result.contracts[0].signatures).toEqual([
            { userId: USER_ID, signedAt },
            { userId: "user-2", signedAt },
        ]);
        expect(JSON.stringify(result.contracts)).not.toContain(
            "full text that must not leak",
        );
    });

    it("exports only the user's own community ballot cast", async () => {
        const castAt = new Date("2026-04-01T09:00:00.000Z");
        communityVoteModel.find.mockReturnValue(
            queryMock([
                {
                    _id: "cv-1",
                    title: "Repaint the hall?",
                    status: "open",
                    casts: [
                        { userId: USER_ID, choices: ["yes"], castAt },
                        {
                            userId: "user-2",
                            choices: ["no"],
                            castAt: new Date(),
                        },
                    ],
                },
            ]),
        );

        const result = await service.exportUserData(USER_ID);

        expect(communityVoteModel.find).toHaveBeenCalledWith({
            "casts.userId": USER_ID,
        });
        expect(result.communityBallots).toEqual([
            {
                id: "cv-1",
                title: "Repaint the hall?",
                status: "open",
                choices: ["yes"],
                castAt,
            },
        ]);
        expect(JSON.stringify(result.communityBallots)).not.toContain("user-2");
    });

    it("queries bookings where the user is initiator, payer or payee", async () => {
        await service.exportUserData(USER_ID);

        expect(bookingModel.find).toHaveBeenCalledWith({
            $or: [
                { initiatorId: USER_ID },
                { payerId: USER_ID },
                { payeeId: USER_ID },
            ],
        });
    });

    it("queries votes and services by the user id only", async () => {
        await service.exportUserData(USER_ID);

        expect(voteModel.find).toHaveBeenCalledWith({ userId: USER_ID });
        expect(serviceModel.find).toHaveBeenCalledWith({
            createdBy: USER_ID,
        });
    });

    it("returns empty socialData when Neo4j is unavailable", async () => {
        neo4jSession.run.mockRejectedValue(new Error("neo4j down"));

        const result = await service.exportUserData(USER_ID);

        expect(result.socialData).toEqual([]);
        expect(neo4jSession.close).toHaveBeenCalled();
    });
});
