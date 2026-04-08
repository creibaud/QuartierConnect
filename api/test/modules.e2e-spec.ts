import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
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

    // ─── Social / Recommendations ─────────────────────────────────────────────

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

    // ─── Contracts ────────────────────────────────────────────────────────────

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
            const totp = currentTotp(userTotpSecret);
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

    // ─── Messaging ────────────────────────────────────────────────────────────

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
    });

    // ─── Votes ────────────────────────────────────────────────────────────────

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

    // ─── Documents ───────────────────────────────────────────────────────────

    describe("Documents", () => {
        let fileId: string;

        it("GET /documents/me returns 401 without token", async () => {
            await request(app.getHttpServer()).get("/documents/me").expect(401);
        });

        it("GET /documents/me returns empty array initially", async () => {
            const res = await request(app.getHttpServer())
                .get("/documents/me")
                .set("Authorization", `Bearer ${userToken}`)
                .expect(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        it("POST /documents/upload uploads a file", async () => {
            const res = await request(app.getHttpServer())
                .post("/documents/upload")
                .set("Authorization", `Bearer ${userToken}`)
                .attach(
                    "file",
                    Buffer.from("hello document e2e"),
                    "test-e2e.txt",
                )
                .expect(201);

            expect(res.body.fileId).toBeTruthy();
            expect(res.body.fileName).toBe("test-e2e.txt");
            fileId = res.body.fileId as string;
        });

        it("GET /documents/me returns the uploaded document", async () => {
            const res = await request(app.getHttpServer())
                .get("/documents/me")
                .set("Authorization", `Bearer ${userToken}`)
                .expect(200);
            expect(res.body.length).toBeGreaterThan(0);
        });

        it("GET /documents/:id/download streams the file", async () => {
            const res = await request(app.getHttpServer())
                .get(`/documents/${fileId}/download`)
                .set("Authorization", `Bearer ${userToken}`)
                .expect(200);
            expect(res.headers["content-disposition"]).toContain("attachment");
        });

        it("GET /documents/:id/audit requires moderator (returns 403 for resident)", async () => {
            await request(app.getHttpServer())
                .get(`/documents/${fileId}/audit`)
                .set("Authorization", `Bearer ${userToken}`)
                .expect(403);
        });

        it("GET /documents/:id/audit returns audit log for admin", async () => {
            const res = await request(app.getHttpServer())
                .get(`/documents/${fileId}/audit`)
                .set("Authorization", `Bearer ${adminToken}`)
                .expect(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);
            expect(res.body[0].action).toBe("upload");
        });

        it("DELETE /documents/:id soft-deletes the document", async () => {
            const res = await request(app.getHttpServer())
                .delete(`/documents/${fileId}`)
                .set("Authorization", `Bearer ${userToken}`)
                .expect(200);
            expect(res.body.success).toBe(true);
        });

        it("GET /documents/:id/download returns 404 after deletion", async () => {
            await request(app.getHttpServer())
                .get(`/documents/${fileId}/download`)
                .set("Authorization", `Bearer ${userToken}`)
                .expect(404);
        });
    });

    // ─── Me / RGPD ───────────────────────────────────────────────────────────

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

    // ─── DSL ─────────────────────────────────────────────────────────────────

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
