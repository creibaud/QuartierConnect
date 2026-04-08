import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { io, Socket } from "socket.io-client";
import * as speakeasy from "speakeasy";
import request from "supertest";
import { AppModule } from "../src/app.module";

const DEMO_PASSWORD = "Demo1234!";

function currentTotp(secret: string): string {
    return speakeasy.totp({ secret, encoding: "base32" });
}

async function registerAndLogin(
    app: INestApplication,
    email: string,
): Promise<{ accessToken: string }> {
    const regRes = await request(app.getHttpServer())
        .post("/auth/register")
        .send({ email, password: DEMO_PASSWORD })
        .expect(201);

    const urlParams = new URL(
        regRes.body.otpauthUrl.replace("otpauth://", "http://"),
    );
    const totpSecret = urlParams.searchParams.get("secret")!;

    const loginRes = await request(app.getHttpServer())
        .post("/auth/login")
        .send({
            email,
            password: DEMO_PASSWORD,
            totpCode: currentTotp(totpSecret),
        })
        .expect(200);

    return { accessToken: loginRes.body.accessToken as string };
}

function connectSocket(port: number, token?: string): Socket {
    return io(`http://localhost:${port}/messaging`, {
        auth: token ? { token } : {},
        transports: ["websocket"],
        forceNew: true,
    });
}

function waitForEvent<T>(
    socket: Socket,
    event: string,
    timeoutMs = 3000,
): Promise<T> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(
            () => reject(new Error(`Timeout waiting for "${event}"`)),
            timeoutMs,
        );
        socket.once(event, (data: T) => {
            clearTimeout(timer);
            resolve(data);
        });
    });
}

function waitForConnect(socket: Socket, timeoutMs = 3000): Promise<void> {
    return new Promise((resolve, reject) => {
        if (socket.connected) {
            resolve();
            return;
        }
        const timer = setTimeout(
            () => reject(new Error("Socket connect timeout")),
            timeoutMs,
        );
        socket.once("connect", () => {
            clearTimeout(timer);
            resolve();
        });
        socket.once("connect_error", (err) => {
            clearTimeout(timer);
            reject(err);
        });
    });
}

describe("Messaging WebSocket (e2e)", () => {
    let app: INestApplication;
    let port: number;
    let token1: string;
    let token2: string;
    let conversationId: string;

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = module.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
        await app.init();
        await app.listen(0);

        const ts = Date.now();
        const r1 = await registerAndLogin(app, `ws-user1-${ts}@test.fr`);
        const r2 = await registerAndLogin(app, `ws-user2-${ts}@test.fr`);
        token1 = r1.accessToken;
        token2 = r2.accessToken;

        const payload2 = JSON.parse(
            Buffer.from(token2.split(".")[1], "base64url").toString(),
        ) as { sub: string };

        const convRes = await request(app.getHttpServer())
            .post("/messaging/conversations")
            .set("Authorization", `Bearer ${token1}`)
            .send({ participants: [payload2.sub] })
            .expect(201);

        conversationId = convRes.body._id as string;

        const server = app.getHttpServer() as { address(): { port: number } };
        port = server.address().port;
    });

    afterAll(async () => {
        await app.close();
    });

    describe("Connection", () => {
        it("connects successfully with a valid JWT", async () => {
            const socket = connectSocket(port, token1);
            await waitForConnect(socket);
            expect(socket.connected).toBe(true);
            socket.disconnect();
        });

        it("is disconnected when no token is provided", async () => {
            const socket = connectSocket(port);
            await new Promise<void>((resolve) => {
                const timer = setTimeout(() => {
                    socket.disconnect();
                    resolve();
                }, 1000);
                socket.once("disconnect", () => {
                    clearTimeout(timer);
                    resolve();
                });
                socket.connect();
            });
            expect(socket.connected).toBe(false);
        });

        it("is disconnected when an invalid token is provided", async () => {
            const socket = connectSocket(port, "invalid.jwt.token");
            await new Promise<void>((resolve) => {
                const timer = setTimeout(() => {
                    socket.disconnect();
                    resolve();
                }, 1500);
                socket.once("disconnect", () => {
                    clearTimeout(timer);
                    resolve();
                });
                socket.connect();
            });
            expect(socket.connected).toBe(false);
        });
    });

    describe("join_conversation", () => {
        it("joins a conversation room when participant", async () => {
            const socket = connectSocket(port, token1);
            await waitForConnect(socket);

            const result = await new Promise<unknown>((resolve, reject) => {
                socket.emit(
                    "join_conversation",
                    conversationId,
                    (res: unknown) => resolve(res),
                );
                setTimeout(() => reject(new Error("join timeout")), 3000);
            });

            expect(result).toMatchObject({ joined: conversationId });
            socket.disconnect();
        });

        it("returns error when not a participant", async () => {
            const ts = Date.now();
            const r3 = await registerAndLogin(app, `ws-user3-${ts}@test.fr`);
            const socket = connectSocket(port, r3.accessToken);
            await waitForConnect(socket);

            const error = await new Promise<unknown>((resolve) => {
                socket.emit(
                    "join_conversation",
                    conversationId,
                    (res: unknown) => resolve(res),
                );
                socket.once("exception", (err: unknown) => resolve(err));
                setTimeout(() => resolve({ error: "no response" }), 3000);
            });

            expect(JSON.stringify(error)).toMatch(
                /participant|Unauthorized|error/i,
            );
            socket.disconnect();
        });
    });

    describe("send_message + new_message broadcast", () => {
        it("sends a message and both participants receive new_message", async () => {
            const socket1 = connectSocket(port, token1);
            const socket2 = connectSocket(port, token2);

            await Promise.all([
                waitForConnect(socket1),
                waitForConnect(socket2),
            ]);

            await new Promise<void>((resolve, reject) => {
                socket1.emit("join_conversation", conversationId, () =>
                    resolve(),
                );
                setTimeout(() => reject(new Error("join timeout")), 3000);
            });
            await new Promise<void>((resolve, reject) => {
                socket2.emit("join_conversation", conversationId, () =>
                    resolve(),
                );
                setTimeout(() => reject(new Error("join timeout")), 3000);
            });

            const received = waitForEvent<{ content: string }>(
                socket2,
                "new_message",
            );

            socket1.emit("send_message", {
                conversationId,
                content: "Hello from socket E2E",
            });

            const msg = await received;
            expect(msg.content).toBe("Hello from socket E2E");

            socket1.disconnect();
            socket2.disconnect();
        });

        it("returns the saved message as ack", async () => {
            const socket = connectSocket(port, token1);
            await waitForConnect(socket);

            await new Promise<void>((resolve, reject) => {
                socket.emit("join_conversation", conversationId, () =>
                    resolve(),
                );
                setTimeout(() => reject(new Error("join timeout")), 3000);
            });

            const ack = await new Promise<{ content: string }>(
                (resolve, reject) => {
                    socket.emit(
                        "send_message",
                        { conversationId, content: "Ack test" },
                        (res: { content: string }) => resolve(res),
                    );
                    setTimeout(
                        () => reject(new Error("send_message ack timeout")),
                        3000,
                    );
                },
            );

            expect(ack.content).toBe("Ack test");
            socket.disconnect();
        });
    });

    describe("leave_conversation", () => {
        it("leaves a room and no longer receives messages", async () => {
            const socket1 = connectSocket(port, token1);
            const socket2 = connectSocket(port, token2);

            await Promise.all([
                waitForConnect(socket1),
                waitForConnect(socket2),
            ]);

            await new Promise<void>((r, j) => {
                socket1.emit("join_conversation", conversationId, () => r());
                setTimeout(() => j(new Error("timeout")), 2000);
            });
            await new Promise<void>((r, j) => {
                socket2.emit("join_conversation", conversationId, () => r());
                setTimeout(() => j(new Error("timeout")), 2000);
            });

            const result = await new Promise<unknown>((resolve, reject) => {
                socket2.emit(
                    "leave_conversation",
                    conversationId,
                    (res: unknown) => resolve(res),
                );
                setTimeout(() => reject(new Error("leave timeout")), 3000);
            });
            expect(result).toMatchObject({ left: conversationId });

            let receivedAfterLeave = false;
            socket2.once("new_message", () => {
                receivedAfterLeave = true;
            });

            socket1.emit("send_message", {
                conversationId,
                content: "Should not arrive",
            });
            await new Promise((resolve) => setTimeout(resolve, 500));

            expect(receivedAfterLeave).toBe(false);

            socket1.disconnect();
            socket2.disconnect();
        });
    });
});
