import {
    ConflictException,
    ForbiddenException,
    NotFoundException,
} from "@nestjs/common";
import { ObjectId } from "mongodb";
import type { MongoDatabase } from "src/database/mongodb/mongodb.type";
import { MessagesService } from "src/modules/messages/messages.service";

const USER_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const OTHER_USER_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const CHAT_ID = new ObjectId().toHexString();
const MESSAGE_ID = new ObjectId().toHexString();

const baseChat = {
    _id: new ObjectId(CHAT_ID),
    participantIds: [USER_ID, OTHER_USER_ID],
    createdAt: new Date(),
    updatedAt: new Date(),
};

const baseMessage = {
    _id: new ObjectId(MESSAGE_ID),
    chatId: CHAT_ID,
    authorUserId: USER_ID,
    content: "Hello",
    attachments: [],
    createdAt: new Date(),
    updatedAt: new Date(),
};

describe("MessagesService", () => {
    let service: MessagesService;
    let mongo: jest.Mocked<MongoDatabase>;
    let gateway: { broadcastMessage: jest.Mock };

    beforeEach(() => {
        mongo = {
            collection: jest.fn(),
        } as unknown as jest.Mocked<MongoDatabase>;

        gateway = {
            broadcastMessage: jest.fn(),
        };

        service = new MessagesService(mongo, gateway);
    });

    describe("findMyChats", () => {
        it("returns chats for the user sorted by lastMessageAt", async () => {
            const toArray = jest.fn().mockResolvedValue([baseChat]);
            const sort = jest.fn().mockReturnValue({ toArray });
            const find = jest.fn().mockReturnValue({ sort });

            (mongo.collection as jest.Mock).mockReturnValue({ find });

            const result = await service.findMyChats(USER_ID);

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe(CHAT_ID);
        });
    });

    describe("createChat", () => {
        it("creates a new 1-to-1 chat when none exists", async () => {
            const findOne = jest.fn().mockResolvedValue(null);
            const insertOne = jest
                .fn()
                .mockResolvedValue({ insertedId: new ObjectId(CHAT_ID) });

            (mongo.collection as jest.Mock).mockReturnValue({
                findOne,
                insertOne,
            });

            const result = await service.createChat(USER_ID, {
                participantIds: [OTHER_USER_ID],
            });

            expect(result.participantIds).toContain(USER_ID);
            expect(result.participantIds).toContain(OTHER_USER_ID);
        });

        it("throws ConflictException when 1-to-1 chat already exists", async () => {
            const findOne = jest.fn().mockResolvedValue(baseChat);

            (mongo.collection as jest.Mock).mockReturnValue({ findOne });

            await expect(
                service.createChat(USER_ID, {
                    participantIds: [OTHER_USER_ID],
                }),
            ).rejects.toBeInstanceOf(ConflictException);
        });
    });

    describe("sendMessage", () => {
        it("sends a message successfully and broadcasts", async () => {
            const findOne = jest.fn().mockResolvedValue(baseChat);
            const insertOne = jest
                .fn()
                .mockResolvedValue({ insertedId: new ObjectId(MESSAGE_ID) });
            const updateOne = jest.fn().mockResolvedValue({});

            (mongo.collection as jest.Mock).mockImplementation(
                (collection: string) => {
                    if (collection === "chats") return { findOne, updateOne };
                    return { insertOne };
                },
            );

            const result = await service.sendMessage(CHAT_ID, USER_ID, {
                content: "Hello",
            });

            expect(result.content).toBe("Hello");
            expect(gateway.broadcastMessage).toHaveBeenCalledWith(
                CHAT_ID,
                expect.objectContaining({ content: "Hello" }),
            );
        });

        it("throws ForbiddenException when user is not a participant", async () => {
            const findOne = jest.fn().mockResolvedValue(baseChat);

            (mongo.collection as jest.Mock).mockReturnValue({ findOne });

            await expect(
                service.sendMessage(CHAT_ID, "non-participant-id", {
                    content: "Hi",
                }),
            ).rejects.toBeInstanceOf(ForbiddenException);
        });
    });

    describe("deleteMessage", () => {
        it("allows message author to delete their message", async () => {
            const findOne = jest.fn().mockResolvedValue(baseMessage);
            const deleteOne = jest.fn().mockResolvedValue({});

            (mongo.collection as jest.Mock).mockReturnValue({
                findOne,
                deleteOne,
            });

            await expect(
                service.deleteMessage(MESSAGE_ID, USER_ID, "resident"),
            ).resolves.toBeUndefined();
        });

        it("allows a moderator to delete any message", async () => {
            const findOne = jest.fn().mockResolvedValue(baseMessage);
            const deleteOne = jest.fn().mockResolvedValue({});

            (mongo.collection as jest.Mock).mockReturnValue({
                findOne,
                deleteOne,
            });

            await expect(
                service.deleteMessage(
                    MESSAGE_ID,
                    "moderator-user-id",
                    "moderator",
                ),
            ).resolves.toBeUndefined();
        });

        it("throws ForbiddenException when non-author non-moderator tries to delete", async () => {
            const findOne = jest.fn().mockResolvedValue(baseMessage);

            (mongo.collection as jest.Mock).mockReturnValue({ findOne });

            await expect(
                service.deleteMessage(MESSAGE_ID, "other-user-id", "resident"),
            ).rejects.toBeInstanceOf(ForbiddenException);
        });

        it("throws NotFoundException when message does not exist", async () => {
            const findOne = jest.fn().mockResolvedValue(null);

            (mongo.collection as jest.Mock).mockReturnValue({ findOne });

            await expect(
                service.deleteMessage(MESSAGE_ID, USER_ID, "resident"),
            ).rejects.toBeInstanceOf(NotFoundException);
        });
    });
});
