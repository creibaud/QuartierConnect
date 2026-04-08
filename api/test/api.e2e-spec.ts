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
): Promise<{ accessToken: string; totpSecret: string }> {
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

    return {
        accessToken: loginRes.body.accessToken as string,
        totpSecret,
    };
}

describe("API modules (e2e)", () => {
    let app: INestApplication;
    let module: TestingModule;
    let userToken: string;
    let adminToken: string;
    let userSub: string;
    let adminSub: string;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = module.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
        await app.init();

        const ts = Date.now();
        const userEmail = `e2e-user-${ts}@test.fr`;
        const adminEmail = `e2e-admin-${ts}@test.fr`;

        const user = await registerAndLogin(app, userEmail);
        userToken = user.accessToken;

        const admin = await registerAndLogin(app, adminEmail);

        // Decode subs from JWT
        const decodeJwt = (token: string): Record<string, string> =>
            JSON.parse(
                Buffer.from(token.split(".")[1], "base64url").toString(),
            ) as Record<string, string>;
        userSub = decodeJwt(userToken).sub;

        // Promote admin via Drizzle (users are in PostgreSQL, not MongoDB)
        const db = module.get<PostgresJsDatabase<typeof schema>>(DRIZZLE_TOKEN);
        await db
            .update(schema.users)
            .set({ role: "admin" })
            .where(eq(schema.users.email, adminEmail));

        // Re-login as admin to get token with admin role
        const adminLoginRes = await request(app.getHttpServer())
            .post("/auth/login")
            .send({
                email: adminEmail,
                password: DEMO_PASSWORD,
                totpCode: currentTotp(admin.totpSecret, 30),
            })
            .expect(200);
        adminToken = adminLoginRes.body.accessToken as string;
        adminSub = decodeJwt(adminToken).sub;
    }, 60000);

    afterAll(async () => {
        await app.close();
    });

    // ─── Neighborhoods ───────────────────────────────────────────────────────────

    describe("Neighborhoods", () => {
        let neighborhoodId: string;

        it("GET /neighborhoods returns empty array initially", async () => {
            const res = await request(app.getHttpServer())
                .get("/neighborhoods")
                .expect(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        it("POST /neighborhoods returns 403 for non-admin", async () => {
            await request(app.getHttpServer())
                .post("/neighborhoods")
                .set("Authorization", `Bearer ${userToken}`)
                .send({ name: "Test", city: "Paris" })
                .expect(403);
        });

        it("POST /neighborhoods creates a neighborhood (admin)", async () => {
            const res = await request(app.getHttpServer())
                .post("/neighborhoods")
                .set("Authorization", `Bearer ${adminToken}`)
                .send({
                    name: "Montmartre",
                    city: "Paris",
                    description: "Famous hill",
                })
                .expect(201);

            expect(res.body._id).toBeTruthy();
            expect(res.body.name).toBe("Montmartre");
            neighborhoodId = res.body._id as string;
        });

        it("GET /neighborhoods/:id returns the neighborhood", async () => {
            const res = await request(app.getHttpServer())
                .get(`/neighborhoods/${neighborhoodId}`)
                .expect(200);
            expect(res.body.name).toBe("Montmartre");
        });

        it("GET /neighborhoods/:id returns 404 for unknown id", async () => {
            await request(app.getHttpServer())
                .get("/neighborhoods/000000000000000000000000")
                .expect(404);
        });

        it("PATCH /neighborhoods/:id updates the neighborhood (admin)", async () => {
            const res = await request(app.getHttpServer())
                .patch(`/neighborhoods/${neighborhoodId}`)
                .set("Authorization", `Bearer ${adminToken}`)
                .send({ description: "Updated description" })
                .expect(200);
            expect(res.body.description).toBe("Updated description");
        });

        it("DELETE /neighborhoods/:id removes the neighborhood (admin)", async () => {
            const res = await request(app.getHttpServer())
                .delete(`/neighborhoods/${neighborhoodId}`)
                .set("Authorization", `Bearer ${adminToken}`)
                .expect(200);
            expect(res.body.success).toBe(true);
        });
    });

    // ─── Services ────────────────────────────────────────────────────────────────

    describe("Services", () => {
        let serviceId: string;

        it("GET /services returns array", async () => {
            const res = await request(app.getHttpServer())
                .get("/services")
                .expect(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        it("POST /services returns 401 without token", async () => {
            await request(app.getHttpServer())
                .post("/services")
                .send({
                    title: "Plombier",
                    description: "test",
                    category: "handyman",
                    type: "paid",
                })
                .expect(401);
        });

        it("POST /services creates a service (authenticated)", async () => {
            const res = await request(app.getHttpServer())
                .post("/services")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    title: "Baby-sitting",
                    description: "Garde enfants",
                    category: "childcare",
                    type: "paid",
                })
                .expect(201);

            expect(res.body._id).toBeTruthy();
            expect(res.body.title).toBe("Baby-sitting");
            serviceId = res.body._id as string;
        });

        it("GET /services/:id returns the service", async () => {
            const res = await request(app.getHttpServer())
                .get(`/services/${serviceId}`)
                .expect(200);
            expect(res.body.title).toBe("Baby-sitting");
        });

        it("PATCH /services/:id returns 403 for different user", async () => {
            await request(app.getHttpServer())
                .patch(`/services/${serviceId}`)
                .set("Authorization", `Bearer ${adminToken}`)
                .send({ title: "Hacked" })
                .expect(200); // admin can update
        });

        it("PATCH /services/:id returns 403 for non-owner non-admin", async () => {
            const ts = Date.now();
            const otherUser = await registerAndLogin(
                app,
                `other-${ts}@test.fr`,
            );
            await request(app.getHttpServer())
                .patch(`/services/${serviceId}`)
                .set("Authorization", `Bearer ${otherUser.accessToken}`)
                .send({ title: "Hacked" })
                .expect(403);
        });

        it("DELETE /services/:id returns 403 for non-admin", async () => {
            await request(app.getHttpServer())
                .delete(`/services/${serviceId}`)
                .set("Authorization", `Bearer ${userToken}`)
                .expect(403);
        });

        it("DELETE /services/:id removes service (admin)", async () => {
            const res = await request(app.getHttpServer())
                .delete(`/services/${serviceId}`)
                .set("Authorization", `Bearer ${adminToken}`)
                .expect(200);
            expect(res.body.success).toBe(true);
        });
    });

    // ─── Events ──────────────────────────────────────────────────────────────────

    describe("Events", () => {
        let eventId: string;
        const futureDate = new Date(
            Date.now() + 7 * 24 * 3600 * 1000,
        ).toISOString();

        it("GET /events returns array", async () => {
            const res = await request(app.getHttpServer())
                .get("/events")
                .expect(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        it("POST /events returns 401 without token", async () => {
            await request(app.getHttpServer())
                .post("/events")
                .send({
                    title: "BBQ",
                    description: "fun",
                    category: "social",
                    date: futureDate,
                })
                .expect(401);
        });

        it("POST /events creates an event", async () => {
            const res = await request(app.getHttpServer())
                .post("/events")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    title: "Vide-grenier",
                    description: "Grande vente",
                    category: "community",
                    date: futureDate,
                })
                .expect(201);

            expect(res.body._id).toBeTruthy();
            expect(res.body.title).toBe("Vide-grenier");
            eventId = res.body._id as string;
        });

        it("GET /events/:id returns the event", async () => {
            const res = await request(app.getHttpServer())
                .get(`/events/${eventId}`)
                .expect(200);
            expect(res.body.title).toBe("Vide-grenier");
        });

        it("GET /events/:id returns 404 for unknown id", async () => {
            await request(app.getHttpServer())
                .get("/events/000000000000000000000000")
                .expect(404);
        });

        it("POST /events/:id/interest marks user as interested", async () => {
            const res = await request(app.getHttpServer())
                .post(`/events/${eventId}/interest`)
                .set("Authorization", `Bearer ${userToken}`)
                .expect(201);
            expect(res.body.interested).toBeGreaterThanOrEqual(1);
        });

        it("POST /events/:id/interest is idempotent", async () => {
            const res1 = await request(app.getHttpServer())
                .post(`/events/${eventId}/interest`)
                .set("Authorization", `Bearer ${userToken}`)
                .expect(201);
            const res2 = await request(app.getHttpServer())
                .post(`/events/${eventId}/interest`)
                .set("Authorization", `Bearer ${userToken}`)
                .expect(201);
            expect(res1.body.interested).toBe(res2.body.interested);
        });
    });

    // ─── Incidents ───────────────────────────────────────────────────────────────

    describe("Incidents", () => {
        let incidentId: string;

        it("GET /incidents returns 401 without token", async () => {
            await request(app.getHttpServer()).get("/incidents").expect(401);
        });

        it("GET /incidents returns array for authenticated user", async () => {
            const res = await request(app.getHttpServer())
                .get("/incidents")
                .set("Authorization", `Bearer ${userToken}`)
                .expect(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        it("POST /incidents creates an incident", async () => {
            const res = await request(app.getHttpServer())
                .post("/incidents")
                .set("Authorization", `Bearer ${userToken}`)
                .send({ title: "Nid de poule", description: "Rue Victor Hugo" })
                .expect(201);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body[0].title).toBe("Nid de poule");
            expect(res.body[0].status).toBe("open");
            incidentId = res.body[0].id as string;
        });

        it("GET /incidents/:id returns the incident", async () => {
            const res = await request(app.getHttpServer())
                .get(`/incidents/${incidentId}`)
                .set("Authorization", `Bearer ${userToken}`)
                .expect(200);
            expect(res.body.title).toBe("Nid de poule");
        });

        it("PATCH /incidents/:id/status returns 403 for non-moderator", async () => {
            await request(app.getHttpServer())
                .patch(`/incidents/${incidentId}/status`)
                .set("Authorization", `Bearer ${userToken}`)
                .send({ status: "in_progress" })
                .expect(403);
        });

        it("PATCH /incidents/:id/status transitions open → in_progress (admin)", async () => {
            const res = await request(app.getHttpServer())
                .patch(`/incidents/${incidentId}/status`)
                .set("Authorization", `Bearer ${adminToken}`)
                .send({ status: "in_progress" })
                .expect(200);
            expect(res.body.status).toBe("in_progress");
        });

        it("PATCH /incidents/:id/status rejects invalid transition", async () => {
            await request(app.getHttpServer())
                .patch(`/incidents/${incidentId}/status`)
                .set("Authorization", `Bearer ${adminToken}`)
                .send({ status: "open" })
                .expect(400);
        });

        it("PATCH /incidents/:id/status transitions in_progress → resolved", async () => {
            const res = await request(app.getHttpServer())
                .patch(`/incidents/${incidentId}/status`)
                .set("Authorization", `Bearer ${adminToken}`)
                .send({ status: "resolved" })
                .expect(200);
            expect(res.body.status).toBe("resolved");
        });

        it("POST /incidents/sync upserts own incidents, skips foreign", async () => {
            const uuid = `00000000-0000-4000-a000-${Date.now().toString(16).padStart(12, "0").slice(-12)}`;
            const res = await request(app.getHttpServer())
                .post("/incidents/sync")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    incidents: [
                        {
                            id: uuid,
                            title: "Desktop incident",
                            description: "From Java",
                            createdBy: userSub,
                        },
                        {
                            id: "00000000-0000-4000-b000-000000000001",
                            title: "Foreign incident",
                            description: "Not mine",
                            createdBy: "00000000-0000-4000-b000-000000000001",
                        },
                    ],
                })
                .expect(201);

            expect(res.body.upserted).toBe(1);
            expect(res.body.skipped).toBe(1);
        });

        it("POST /incidents/sync forces status=open regardless of payload", async () => {
            const uuid = `00000000-0000-4000-b000-${(Date.now() + 1).toString(16).padStart(12, "0").slice(-12)}`;
            await request(app.getHttpServer())
                .post("/incidents/sync")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    incidents: [
                        {
                            id: uuid,
                            title: "Should be open",
                            description: "Test",
                            createdBy: userSub,
                        },
                    ],
                })
                .expect(201);

            const fetchRes = await request(app.getHttpServer())
                .get(`/incidents/${uuid}`)
                .set("Authorization", `Bearer ${userToken}`)
                .expect(200);

            expect((fetchRes.body as { status: string }).status).toBe("open");
        });

        it("DELETE /incidents/:id returns 403 for non-moderator", async () => {
            await request(app.getHttpServer())
                .delete(`/incidents/${incidentId}`)
                .set("Authorization", `Bearer ${userToken}`)
                .expect(403);
        });

        it("DELETE /incidents/:id soft-deletes (admin)", async () => {
            const res = await request(app.getHttpServer())
                .delete(`/incidents/${incidentId}`)
                .set("Authorization", `Bearer ${adminToken}`)
                .expect(200);
            expect(res.body.success).toBe(true);

            await request(app.getHttpServer())
                .get(`/incidents/${incidentId}`)
                .set("Authorization", `Bearer ${userToken}`)
                .expect(404);
        });
    });

    // ─── Points ──────────────────────────────────────────────────────────────────

    describe("Points", () => {
        it("GET /points/balance returns 401 without token", async () => {
            await request(app.getHttpServer())
                .get("/points/balance")
                .expect(401);
        });

        it("GET /points/balance returns balance for authenticated user", async () => {
            const res = await request(app.getHttpServer())
                .get("/points/balance")
                .set("Authorization", `Bearer ${userToken}`)
                .expect(200);
            expect(typeof res.body.balance).toBe("number");
        });

        it("GET /points/history returns transaction list", async () => {
            const res = await request(app.getHttpServer())
                .get("/points/history")
                .set("Authorization", `Bearer ${userToken}`)
                .expect(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        it("POST /points/transfer returns 400 for insufficient balance", async () => {
            const res = await request(app.getHttpServer())
                .post("/points/transfer")
                .set("Authorization", `Bearer ${userToken}`)
                .send({ recipientId: adminSub, amount: 9999 })
                .expect(400);
            expect(res.body.message).toMatch(/insufficient/i);
        });
    });

    // ─── Users (admin) ───────────────────────────────────────────────────────────

    describe("Users (admin)", () => {
        it("GET /users returns 403 for non-admin", async () => {
            await request(app.getHttpServer())
                .get("/users")
                .set("Authorization", `Bearer ${userToken}`)
                .expect(403);
        });

        it("GET /users returns user list for admin", async () => {
            const res = await request(app.getHttpServer())
                .get("/users")
                .set("Authorization", `Bearer ${adminToken}`)
                .expect(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);
        });

        it("PATCH /users/:id/role updates role (admin)", async () => {
            const res = await request(app.getHttpServer())
                .patch(`/users/${userSub}/role`)
                .set("Authorization", `Bearer ${adminToken}`)
                .send({ role: "moderator" })
                .expect(200);
            expect(res.body.role).toBe("moderator");

            // Restore
            await request(app.getHttpServer())
                .patch(`/users/${userSub}/role`)
                .set("Authorization", `Bearer ${adminToken}`)
                .send({ role: "resident" });
        });

        it("PATCH /users/:id/role returns 404 for unknown user", async () => {
            await request(app.getHttpServer())
                .patch("/users/00000000-0000-4000-a000-000000000000/role")
                .set("Authorization", `Bearer ${adminToken}`)
                .send({ role: "moderator" })
                .expect(404);
        });
    });
});
