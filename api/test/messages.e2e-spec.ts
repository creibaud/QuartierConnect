import { MailerService } from "@nestjs-modules/mailer";
import {
    ForbiddenException,
    INestApplication,
    NotFoundException,
    UnauthorizedException,
    VersioningType,
} from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import type { NextFunction, Request, Response } from "express";
import request from "supertest";
import { App } from "supertest/types";
import * as packageJson from "../package.json";
import { AppModule } from "../src/app.module";
import { JwtAuthGuard } from "../src/common/guards/jwt-auth.guard";
import { MessagesService } from "../src/modules/messages/messages.service";

describe("MessagesController (e2e)", () => {
    let app: INestApplication<App>;
    let jwtGuardCanActivateSpy: jest.SpyInstance;

    const majorVersion = packageJson.version.split(".")[0];

    const messagesServiceMock = {
        findMyChats: jest.fn(),
        createChat: jest.fn(),
        getChat: jest.fn(),
        getMessages: jest.fn(),
        sendMessage: jest.fn(),
        deleteMessage: jest.fn(),
    };

    const fakeUser = {
        id: "6fce8b71-2d1a-4d4a-9c12-44d4624e8f81",
        email: "john.doe@example.com",
        role: "resident",
    };

    beforeAll(async () => {
        jwtGuardCanActivateSpy = jest
            .spyOn(JwtAuthGuard.prototype, "canActivate")
            .mockImplementation((ctx: ExecutionContext) => {
                const req = ctx
                    .switchToHttp()
                    .getRequest<{ user: typeof fakeUser }>();
                req.user = fakeUser;
                return true;
            });

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider("DRIZZLE")
            .useValue({ execute: jest.fn().mockResolvedValue([{ result: 1 }]) })
            .overrideProvider("MONGODB")
            .useValue({ command: jest.fn().mockResolvedValue({}), collection: jest.fn().mockReturnValue({}) })
            .overrideProvider("NEO4J")
            .useValue({
                verifyConnectivity: jest.fn().mockResolvedValue(undefined),
            })
            .overrideProvider(MailerService)
            .useValue({ sendMail: jest.fn() })
            .overrideProvider(MessagesService)
            .useValue(messagesServiceMock)
            .compile();

        app = moduleFixture.createNestApplication();
        app.use(
            (
                req: Request & { cookies?: Record<string, string> },
                _res: Response,
                next: NextFunction,
            ) => {
                const rawCookieHeader = req.headers.cookie;
                const parsed: Record<string, string> = {};

                const rawCookie = Array.isArray(rawCookieHeader)
                    ? rawCookieHeader.join(";")
                    : rawCookieHeader;

                if (typeof rawCookie === "string") {
                    for (const pair of rawCookie.split(";")) {
                        const [name, ...rest] = pair.trim().split("=");
                        if (!name || rest.length === 0) {
                            continue;
                        }
                        parsed[name] = decodeURIComponent(rest.join("="));
                    }
                }

                req.cookies = parsed;
                next();
            },
        );
        app.enableVersioning({
            type: VersioningType.URI,
            defaultVersion: majorVersion,
        });
        await app.init();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        jwtGuardCanActivateSpy.mockImplementation((ctx: ExecutionContext) => {
            const req = ctx
                .switchToHttp()
                .getRequest<{ user: typeof fakeUser }>();
            req.user = fakeUser;
            return true;
        });
    });

    afterAll(async () => {
        jwtGuardCanActivateSpy.mockRestore();
        await app.close();
    });

    it(`/v${majorVersion}/chats (GET) returns 200 with list of chats`, async () => {
        const chats = [
            { id: "chat-1", participantIds: [fakeUser.id, "other-user"] },
        ];
        messagesServiceMock.findMyChats.mockResolvedValue(chats);

        await request(app.getHttpServer())
            .get(`/v${majorVersion}/chats`)
            .expect(200)
            .expect(({ body }) => {
                expect(body).toEqual(chats);
            });

        expect(messagesServiceMock.findMyChats).toHaveBeenCalledWith(
            fakeUser.id,
        );
    });

    it(`/v${majorVersion}/chats (GET) returns 401 without auth`, async () => {
        jwtGuardCanActivateSpy.mockImplementation(() => {
            throw new UnauthorizedException("Unauthorized");
        });

        await request(app.getHttpServer())
            .get(`/v${majorVersion}/chats`)
            .expect(401);
    });

    it(`/v${majorVersion}/chats (POST) returns 201 when chat created`, async () => {
        const dto = { participantIds: ["other-user-id"], name: "Test Chat" };
        const created = {
            id: "new-chat-id",
            participantIds: [fakeUser.id, "other-user-id"],
            name: "Test Chat",
        };
        messagesServiceMock.createChat.mockResolvedValue(created);

        await request(app.getHttpServer())
            .post(`/v${majorVersion}/chats`)
            .send(dto)
            .expect(201)
            .expect(({ body }) => {
                expect(body).toEqual(created);
            });

        expect(messagesServiceMock.createChat).toHaveBeenCalledWith(
            fakeUser.id,
            dto,
        );
    });

    it(`/v${majorVersion}/chats (POST) returns 401 without auth`, async () => {
        jwtGuardCanActivateSpy.mockImplementation(() => {
            throw new UnauthorizedException("Unauthorized");
        });

        await request(app.getHttpServer())
            .post(`/v${majorVersion}/chats`)
            .send({ participantIds: ["other-user-id"] })
            .expect(401);
    });

    it(`/v${majorVersion}/chats/:id (GET) returns 200 with chat`, async () => {
        const chatId = "chat-123";
        const chat = {
            id: chatId,
            participantIds: [fakeUser.id],
            name: "My Chat",
        };
        messagesServiceMock.getChat.mockResolvedValue(chat);

        await request(app.getHttpServer())
            .get(`/v${majorVersion}/chats/${chatId}`)
            .expect(200)
            .expect(({ body }) => {
                expect(body).toEqual(chat);
            });

        expect(messagesServiceMock.getChat).toHaveBeenCalledWith(
            chatId,
            fakeUser.id,
        );
    });

    it(`/v${majorVersion}/chats/:id (GET) returns 404 when chat not found`, async () => {
        messagesServiceMock.getChat.mockRejectedValue(
            new NotFoundException("Chat not found"),
        );

        await request(app.getHttpServer())
            .get(`/v${majorVersion}/chats/nonexistent-id`)
            .expect(404);
    });

    it(`/v${majorVersion}/chats/:id (GET) returns 403 when not a participant`, async () => {
        messagesServiceMock.getChat.mockRejectedValue(
            new ForbiddenException("You are not a participant in this chat"),
        );

        await request(app.getHttpServer())
            .get(`/v${majorVersion}/chats/chat-123`)
            .expect(403);
    });

    it(`/v${majorVersion}/chats/:id/messages (GET) returns 200 with messages`, async () => {
        const chatId = "chat-123";
        const result = {
            data: [
                { id: "msg-1", content: "Hello", authorUserId: fakeUser.id },
            ],
            meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
        };
        messagesServiceMock.getMessages.mockResolvedValue(result);

        await request(app.getHttpServer())
            .get(`/v${majorVersion}/chats/${chatId}/messages`)
            .expect(200)
            .expect(({ body }) => {
                expect(body).toEqual(result);
            });

        expect(messagesServiceMock.getMessages).toHaveBeenCalledWith(
            chatId,
            fakeUser.id,
            expect.any(Object),
        );
    });

    it(`/v${majorVersion}/chats/:id/messages (GET) returns 403 when not a participant`, async () => {
        messagesServiceMock.getMessages.mockRejectedValue(
            new ForbiddenException("You are not a participant in this chat"),
        );

        await request(app.getHttpServer())
            .get(`/v${majorVersion}/chats/chat-123/messages`)
            .expect(403);
    });

    it(`/v${majorVersion}/chats/:id/messages (POST) returns 201 when message sent`, async () => {
        const chatId = "chat-123";
        const dto = { content: "Hello there!" };
        const message = {
            id: "msg-new",
            content: dto.content,
            authorUserId: fakeUser.id,
        };
        messagesServiceMock.sendMessage.mockResolvedValue(message);

        await request(app.getHttpServer())
            .post(`/v${majorVersion}/chats/${chatId}/messages`)
            .send(dto)
            .expect(201)
            .expect(({ body }) => {
                expect(body).toEqual(message);
            });

        expect(messagesServiceMock.sendMessage).toHaveBeenCalledWith(
            chatId,
            fakeUser.id,
            dto,
        );
    });

    it(`/v${majorVersion}/chats/:id/messages (POST) returns 403 when not a participant`, async () => {
        messagesServiceMock.sendMessage.mockRejectedValue(
            new ForbiddenException("You are not a participant in this chat"),
        );

        await request(app.getHttpServer())
            .post(`/v${majorVersion}/chats/chat-123/messages`)
            .send({ content: "Hello" })
            .expect(403);
    });

    it(`/v${majorVersion}/chats/:id/messages/:msgId (DELETE) returns 204 when message deleted`, async () => {
        const chatId = "chat-123";
        const msgId = "msg-456";
        messagesServiceMock.deleteMessage.mockResolvedValue(undefined);

        await request(app.getHttpServer())
            .delete(`/v${majorVersion}/chats/${chatId}/messages/${msgId}`)
            .expect(204);

        expect(messagesServiceMock.deleteMessage).toHaveBeenCalledWith(
            msgId,
            fakeUser.id,
            fakeUser.role,
        );
    });

    it(`/v${majorVersion}/chats/:id/messages/:msgId (DELETE) returns 404 when message not found`, async () => {
        messagesServiceMock.deleteMessage.mockRejectedValue(
            new NotFoundException("Message not found"),
        );

        await request(app.getHttpServer())
            .delete(`/v${majorVersion}/chats/chat-123/messages/nonexistent-msg`)
            .expect(404);
    });

    it(`/v${majorVersion}/chats/:id/messages/:msgId (DELETE) returns 403 when cannot delete`, async () => {
        messagesServiceMock.deleteMessage.mockRejectedValue(
            new ForbiddenException("You cannot delete this message"),
        );

        await request(app.getHttpServer())
            .delete(`/v${majorVersion}/chats/chat-123/messages/msg-456`)
            .expect(403);
    });
});
