import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ThrottlerStorage } from "@nestjs/throttler";
import { eq } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as speakeasy from "speakeasy";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { DRIZZLE_TOKEN } from "../src/database/drizzle.module";
import * as schema from "../src/database/schema";

const DEMO_PASSWORD = "Demo1234!";

function currentTotp(secret: string, timeOffsetSeconds = 0): string {
    return speakeasy.totp({
        secret,
        encoding: "base32",
        time: Math.floor(Date.now() / 1000) + timeOffsetSeconds,
    });
}

async function registerAndLogin(
    app: INestApplication,
    email: string,
): Promise<{ accessToken: string; totpSecret: string; userId: string }> {
    const regRes = await request(app.getHttpServer())
        .post("/auth/register")
        .send({ email, password: DEMO_PASSWORD, consent: true })
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

    const accessToken = loginRes.body.accessToken as string;
    const payload = JSON.parse(
        Buffer.from(accessToken.split(".")[1], "base64url").toString(),
    ) as { sub: string };

    return { accessToken, totpSecret, userId: payload.sub };
}

describe("New modules (e2e)", () => {
    let app: INestApplication;
    let module: TestingModule;
    let userToken: string;
    let adminToken: string;
    let userTotpSecret: string;
    let userId: string;
    let adminId: string;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = module.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
        await app.init();

        const ts = Date.now();
        const userEmail = `e2e-modules-user-${ts}@test.fr`;
        const adminEmail = `e2e-modules-admin-${ts}@test.fr`;

        const user = await registerAndLogin(app, userEmail);
        userToken = user.accessToken;
        userTotpSecret = user.totpSecret;
        userId = user.userId;

        const admin = await registerAndLogin(app, adminEmail);
        adminId = admin.userId;

        const db = module.get<PostgresJsDatabase<typeof schema>>(DRIZZLE_TOKEN);
        await db
            .update(schema.users)
            .set({ role: "admin" })
            .where(eq(schema.users.email, adminEmail));

        const adminLoginRes = await request(app.getHttpServer())
            .post("/auth/login")
            .send({
                email: adminEmail,
                password: DEMO_PASSWORD,
                totpCode: currentTotp(admin.totpSecret, 30),
            })
            .expect(200);
        adminToken = adminLoginRes.body.accessToken as string;
    }, 60000);

    afterAll(async () => {
        await app.close();
    });

    describe("Recommendations", () => {
        it("GET /recommendations returns 401 without token", async () => {
            await request(app.getHttpServer())
                .get("/recommendations")
                .expect(401);
        });

        it("GET /recommendations returns array (empty if Neo4j not available)", async () => {
            const res = await request(app.getHttpServer())
                .get("/recommendations")
                .set("Authorization", `Bearer ${userToken}`)
                .expect(200);
            expect(Array.isArray(res.body)).toBe(true);
        });
    });

    describe("Contracts", () => {
        let contractId: string;

        it("GET /contracts returns 401 without token", async () => {
            await request(app.getHttpServer()).get("/contracts").expect(401);
        });

        it("GET /contracts returns empty array initially", async () => {
            const res = await request(app.getHttpServer())
                .get("/contracts")
                .set("Authorization", `Bearer ${userToken}`)
                .expect(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        it("POST /contracts creates a contract", async () => {
            const res = await request(app.getHttpServer())
                .post("/contracts")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    title: "Contrat E2E",
                    content:
                        "Le prestataire s'engage à réaliser la prestation.",
                    signatories: [userId, adminId],
                })
                .expect(201);

            expect(res.body._id).toBeTruthy();
            expect(res.body.title).toBe("Contrat E2E");
            expect(res.body.contentHash).toMatch(/^[a-f0-9]{64}$/);
            contractId = res.body._id as string;
        });

        it("POST /contracts returns 400 for missing required fields", async () => {
            await request(app.getHttpServer())
                .post("/contracts")
                .set("Authorization", `Bearer ${userToken}`)
                .send({ title: "Incomplete" })
                .expect(400);
        });

        it("GET /contracts/:id returns the contract", async () => {
            const res = await request(app.getHttpServer())
                .get(`/contracts/${contractId}`)
                .set("Authorization", `Bearer ${userToken}`)
                .expect(200);
            expect(res.body.title).toBe("Contrat E2E");
            expect(res.body.status).toBe("draft");
        });

        it("POST /contracts/:id/sign with valid TOTP signs the contract", async () => {
            const totp = currentTotp(userTotpSecret, 30);
            const res = await request(app.getHttpServer())
                .post(`/contracts/${contractId}/sign`)
                .set("Authorization", `Bearer ${userToken}`)
                .send({ totpCode: totp })
                .expect(201);
            expect(res.body.signatures).toBeDefined();
            expect(
                (res.body.signatures as Array<{ userId: string }>).some(
                    (s) => s.userId === userId,
                ),
            ).toBe(true);
        });

        it("POST /contracts/:id/sign with invalid TOTP returns 400", async () => {
            await request(app.getHttpServer())
                .post(`/contracts/${contractId}/sign`)
                .set("Authorization", `Bearer ${userToken}`)
                .send({ totpCode: "000000" })
                .expect(400);
        });
    });

    describe("Messaging", () => {
        let conversationId: string;

        it("GET /messaging/conversations returns 401 without token", async () => {
            await request(app.getHttpServer())
                .get("/messaging/conversations")
                .expect(401);
        });

        it("GET /messaging/conversations returns empty array initially", async () => {
            const res = await request(app.getHttpServer())
                .get("/messaging/conversations")
                .set("Authorization", `Bearer ${userToken}`)
                .expect(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        it("POST /messaging/conversations creates a conversation", async () => {
            const res = await request(app.getHttpServer())
                .post("/messaging/conversations")
                .set("Authorization", `Bearer ${userToken}`)
                .send({ participants: [userId, adminId] })
                .expect(201);

            expect(res.body._id).toBeTruthy();
            expect(res.body.participants).toContain(userId);
            conversationId = res.body._id as string;
        });

        it("GET /messaging/conversations/:id/messages returns empty message list", async () => {
            const res = await request(app.getHttpServer())
                .get(`/messaging/conversations/${conversationId}/messages`)
                .set("Authorization", `Bearer ${userToken}`)
                .expect(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        it("GET /messaging/conversations/:id/messages returns 404 for unknown conversation", async () => {
            await request(app.getHttpServer())
                .get(
                    "/messaging/conversations/000000000000000000000000/messages",
                )
                .set("Authorization", `Bearer ${userToken}`)
                .expect(404);
        });

        it("GET /messaging/conversations/:id/messages returns 400 for a non-numeric page", async () => {
            await request(app.getHttpServer())
                .get(
                    `/messaging/conversations/${conversationId}/messages?page=abc`,
                )
                .set("Authorization", `Bearer ${userToken}`)
                .expect(400);
        });

        it("GET /messaging/conversations/:id/messages returns 400 for page 0", async () => {
            await request(app.getHttpServer())
                .get(
                    `/messaging/conversations/${conversationId}/messages?page=0`,
                )
                .set("Authorization", `Bearer ${userToken}`)
                .expect(400);
        });
    });

    describe("Votes", () => {
        const fakeTargetId = "000000000000000000000001";

        it("POST /votes returns 401 without token", async () => {
            await request(app.getHttpServer())
                .post("/votes")
                .send({
                    targetType: "incident",
                    targetId: fakeTargetId,
                    voteType: "like",
                })
                .expect(401);
        });

        it("GET /votes/score returns 401 without token", async () => {
            await request(app.getHttpServer())
                .get(
                    `/votes/score?targetType=incident&targetId=${fakeTargetId}`,
                )
                .expect(401);
        });

        it("POST /votes casts an up vote on incident", async () => {
            const res = await request(app.getHttpServer())
                .post("/votes")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    targetType: "incident",
                    targetId: fakeTargetId,
                    voteType: "up",
                })
                .expect(201);

            expect(res.body.action).toBe("added");
            expect(res.body.voteType).toBe("up");
        });

        it("POST /votes toggles off on same vote (action: removed)", async () => {
            const res = await request(app.getHttpServer())
                .post("/votes")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    targetType: "incident",
                    targetId: fakeTargetId,
                    voteType: "up",
                })
                .expect(201);
            expect(res.body.action).toBe("removed");
        });

        it("GET /votes/score returns score object with up/down breakdown", async () => {
            const res = await request(app.getHttpServer())
                .get(
                    `/votes/score?targetType=incident&targetId=${fakeTargetId}`,
                )
                .set("Authorization", `Bearer ${userToken}`)
                .expect(200);
            expect(typeof res.body.score).toBe("number");
            expect(typeof res.body.breakdown.up).toBe("number");
            expect(typeof res.body.breakdown.down).toBe("number");
        });

        it("POST /votes returns 400 for wrong voteType for target (like on incident)", async () => {
            await request(app.getHttpServer())
                .post("/votes")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    targetType: "incident",
                    targetId: fakeTargetId,
                    voteType: "like",
                })
                .expect(400);
        });
    });

    describe("Community votes", () => {
        const binaryOptions = [
            { id: "yes", label: "Oui" },
            { id: "no", label: "Non" },
        ];
        const inOneDay = () =>
            new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        let voteId: string;
        let voterToken: string;
        let voterId: string;

        beforeAll(async () => {
            const ts = Date.now();
            const voter = await registerAndLogin(
                app,
                `e2e-modules-voter-${ts}@test.fr`,
            );
            voterToken = voter.accessToken;
            voterId = voter.userId;

            // The extra login above eats into the 5-per-window auth throttle.
            const throttler = module.get<{ storage: Map<string, unknown> }>(
                ThrottlerStorage,
            );
            throttler.storage.clear();
        }, 30000);

        it("GET /community-votes returns 401 without token", async () => {
            await request(app.getHttpServer())
                .get("/community-votes")
                .expect(401);
        });

        it("POST /community-votes creates a binary vote", async () => {
            const res = await request(app.getHttpServer())
                .post("/community-votes")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    title: "Faut-il installer des bancs au parc ?",
                    description: "Consultation e2e",
                    voteType: "binary",
                    options: binaryOptions,
                    endsAt: inOneDay(),
                    quorum: 0,
                    isAnonymous: false,
                })
                .expect(201);

            expect(res.body._id).toBeTruthy();
            expect(res.body.status).toBe("open");
            expect(res.body.options).toHaveLength(2);
            voteId = res.body._id as string;
        });

        it("POST /community-votes/:id/cast records the creator's ballot", async () => {
            const res = await request(app.getHttpServer())
                .post(`/community-votes/${voteId}/cast`)
                .set("Authorization", `Bearer ${userToken}`)
                .send({ choices: ["yes"] })
                .expect(201);

            expect(
                (res.body.casts as Array<{ userId: string }>).some(
                    (c) => c.userId === userId,
                ),
            ).toBe(true);
        });

        it("POST /community-votes/:id/cast returns 409 on double cast", async () => {
            await request(app.getHttpServer())
                .post(`/community-votes/${voteId}/cast`)
                .set("Authorization", `Bearer ${userToken}`)
                .send({ choices: ["no"] })
                .expect(409);
        });

        it("POST /community-votes/:id/cast returns 400 for an unknown option", async () => {
            await request(app.getHttpServer())
                .post(`/community-votes/${voteId}/cast`)
                .set("Authorization", `Bearer ${voterToken}`)
                .send({ choices: ["maybe"] })
                .expect(400);
        });

        it("GET /community-votes/:id/results aggregates totals per option", async () => {
            await request(app.getHttpServer())
                .post(`/community-votes/${voteId}/cast`)
                .set("Authorization", `Bearer ${voterToken}`)
                .send({ choices: ["no"] })
                .expect(201);

            const res = await request(app.getHttpServer())
                .get(`/community-votes/${voteId}/results`)
                .set("Authorization", `Bearer ${userToken}`)
                .expect(200);

            expect(res.body.totals).toEqual({ yes: 1, no: 1 });
            expect(res.body.totalParticipants).toBe(2);
            expect(res.body.quorumReached).toBe(true);
        });

        it("POST /community-votes/:id/close returns 403 for a non-creator", async () => {
            await request(app.getHttpServer())
                .post(`/community-votes/${voteId}/close`)
                .set("Authorization", `Bearer ${voterToken}`)
                .expect(403);
        });

        it("POST /community-votes/:id/close returns 201 for the creator", async () => {
            const res = await request(app.getHttpServer())
                .post(`/community-votes/${voteId}/close`)
                .set("Authorization", `Bearer ${userToken}`)
                .expect(201);
            expect(res.body.status).toBe("closed");
        });

        it("GET /community-votes hides other users' casts on anonymous votes", async () => {
            const createRes = await request(app.getHttpServer())
                .post("/community-votes")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    title: "Scrutin anonyme e2e",
                    voteType: "binary",
                    options: binaryOptions,
                    endsAt: inOneDay(),
                    quorum: 0,
                    isAnonymous: true,
                })
                .expect(201);
            const anonymousVoteId = createRes.body._id as string;

            await request(app.getHttpServer())
                .post(`/community-votes/${anonymousVoteId}/cast`)
                .set("Authorization", `Bearer ${userToken}`)
                .send({ choices: ["yes"] })
                .expect(201);

            const listRes = await request(app.getHttpServer())
                .get("/community-votes")
                .set("Authorization", `Bearer ${voterToken}`)
                .expect(200);

            const anonymousVote = (
                listRes.body as Array<{
                    _id: string;
                    casts: Array<{ userId: string }>;
                }>
            ).find((v) => v._id === anonymousVoteId);

            expect(anonymousVote).toBeDefined();
            expect(anonymousVote!.casts.some((c) => c.userId === userId)).toBe(
                false,
            );
            expect(
                anonymousVote!.casts.every((c) => c.userId === voterId),
            ).toBe(true);
        });
    });

    describe("Me / RGPD", () => {
        it("GET /users/me/export returns 401 without token", async () => {
            await request(app.getHttpServer())
                .get("/users/me/export")
                .expect(401);
        });

        it("GET /users/me/export returns user data export", async () => {
            const res = await request(app.getHttpServer())
                .get("/users/me/export")
                .set("Authorization", `Bearer ${userToken}`)
                .expect(200);
            expect(res.body.profile).toBeDefined();
            expect(Array.isArray(res.body.incidents)).toBe(true);
            expect(res.body.pointsBalance).toBeDefined();
            expect(Array.isArray(res.body.transactions)).toBe(true);
        });
    });

    describe("DSL", () => {
        let moderatorToken: string;
        let modTotpSecret: string;

        beforeAll(async () => {
            const ts = Date.now();
            const modEmail = `e2e-moderator-${ts}@test.fr`;
            const mod = await registerAndLogin(app, modEmail);
            modTotpSecret = mod.totpSecret;

            const db =
                module.get<PostgresJsDatabase<typeof schema>>(DRIZZLE_TOKEN);
            await db
                .update(schema.users)
                .set({ role: "moderator" })
                .where(eq(schema.users.email, modEmail));

            const loginRes = await request(app.getHttpServer())
                .post("/auth/login")
                .send({
                    email: modEmail,
                    password: DEMO_PASSWORD,
                    totpCode: currentTotp(modTotpSecret, 30),
                })
                .expect(200);
            moderatorToken = loginRes.body.accessToken as string;
        }, 30000);

        it("POST /dsl/query returns 401 without token", async () => {
            await request(app.getHttpServer())
                .post("/dsl/query")
                .send({ query: "FIND incidents LIMIT 5" })
                .expect(401);
        });

        it("POST /dsl/query returns 403 for resident", async () => {
            await request(app.getHttpServer())
                .post("/dsl/query")
                .set("Authorization", `Bearer ${userToken}`)
                .send({ query: "FIND incidents LIMIT 5" })
                .expect(403);
        });

        it("POST /dsl/query compiles a valid DSL query (moderator)", async () => {
            const res = await request(app.getHttpServer())
                .post("/dsl/query")
                .set("Authorization", `Bearer ${moderatorToken}`)
                .send({ query: "FIND incidents LIMIT 5" })
                .expect(201);

            expect(Array.isArray(res.body)).toBe(true);
        });

        it("POST /dsl/query compiles a DSL query with WHERE clause", async () => {
            const res = await request(app.getHttpServer())
                .post("/dsl/query")
                .set("Authorization", `Bearer ${moderatorToken}`)
                .send({
                    query: 'FIND incidents WHERE status = "open" LIMIT 10',
                })
                .expect(201);

            expect(Array.isArray(res.body)).toBe(true);
        });

        it("POST /dsl/query returns 400 for unknown collection", async () => {
            await request(app.getHttpServer())
                .post("/dsl/query")
                .set("Authorization", `Bearer ${moderatorToken}`)
                .send({ query: "FIND passwords LIMIT 5" })
                .expect(400);
        });

        it("POST /dsl/query returns 400 for invalid syntax", async () => {
            await request(app.getHttpServer())
                .post("/dsl/query")
                .set("Authorization", `Bearer ${moderatorToken}`)
                .send({ query: "INVALID QUERY !!!" })
                .expect(400);
        });

        it("POST /dsl/query works for admin role too", async () => {
            const res = await request(app.getHttpServer())
                .post("/dsl/query")
                .set("Authorization", `Bearer ${adminToken}`)
                .send({ query: "FIND services LIMIT 3" })
                .expect(201);

            expect(Array.isArray(res.body)).toBe(true);
        });
    });
});
