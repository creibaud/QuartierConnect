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

    return { accessToken: loginRes.body.accessToken as string, totpSecret };
}

describe("Incidents list contract (e2e)", () => {
    let app: INestApplication;
    let module: TestingModule;
    let adminToken: string;
    // Unique searchable token so assertions stay deterministic against seed data.
    const token = `zzq${Date.now()}`;

    async function createIncident(
        title: string,
        category: string,
    ): Promise<string> {
        const res = await request(app.getHttpServer())
            .post("/incidents")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ title, description: `desc ${title}`, category })
            .expect(201);
        return res.body[0].id as string;
    }

    async function advanceStatus(id: string, status: string): Promise<void> {
        await request(app.getHttpServer())
            .patch(`/incidents/${id}/status`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ status })
            .expect(200);
    }

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = module.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
        await app.init();

        const adminEmail = `e2e-inc-admin-${Date.now()}@test.fr`;
        const admin = await registerAndLogin(app, adminEmail);

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

        // Three tokenized incidents with distinct categories and statuses.
        await createIncident(`${token}-alpha`, "neighborhood"); // stays open
        const beta = await createIncident(`${token}-beta`, "reporting");
        await advanceStatus(beta, "in_progress");
        const gamma = await createIncident(`${token}-gamma`, "bug");
        await advanceStatus(gamma, "in_progress");
        await advanceStatus(gamma, "resolved");
    }, 60000);

    afterAll(async () => {
        await app.close();
    });

    it("searches title/description across every page and reports the total", async () => {
        const paged = await request(app.getHttpServer())
            .get(`/incidents?search=${token}&limit=2`)
            .set("Authorization", `Bearer ${adminToken}`)
            .expect(200);
        expect(paged.headers["x-total-count"]).toBe("3");
        expect(paged.headers["x-total-pages"]).toBe("2");
        expect(paged.body).toHaveLength(2);

        const all = await request(app.getHttpServer())
            .get(`/incidents?search=${token}&limit=100`)
            .set("Authorization", `Bearer ${adminToken}`)
            .expect(200);
        expect(all.body).toHaveLength(3);
        expect(
            all.body.every((i: { title: string }) => i.title.includes(token)),
        ).toBe(true);
    });

    it("filters by category server-side", async () => {
        const res = await request(app.getHttpServer())
            .get(`/incidents?search=${token}&category=bug&limit=100`)
            .set("Authorization", `Bearer ${adminToken}`)
            .expect(200);
        expect(res.headers["x-total-count"]).toBe("1");
        expect(
            res.body.every((i: { category: string }) => i.category === "bug"),
        ).toBe(true);
    });

    it("sorts by status ascending when asked", async () => {
        const res = await request(app.getHttpServer())
            .get(`/incidents?search=${token}&sort=status&order=asc&limit=100`)
            .set("Authorization", `Bearer ${adminToken}`)
            .expect(200);
        const statuses = res.body.map((i: { status: string }) => i.status);
        expect(statuses).toEqual([...statuses].sort());
        expect(statuses).toEqual(["in_progress", "open", "resolved"]);
    });

    it("treats a LIKE metacharacter in search as a literal", async () => {
        const res = await request(app.getHttpServer())
            .get(`/incidents?search=${token}%25&limit=100`)
            .set("Authorization", `Bearer ${adminToken}`)
            .expect(200);
        // "%" is escaped, so it can only match a literal percent — none exist.
        expect(res.headers["x-total-count"]).toBe("0");
        expect(res.body).toHaveLength(0);
    });

    it("keeps the desktop since delta-sync returning a bare array", async () => {
        const res = await request(app.getHttpServer())
            .get("/incidents?since=1970-01-01T00:00:00.000Z&limit=5")
            .set("Authorization", `Bearer ${adminToken}`)
            .expect(200);
        expect(Array.isArray(res.body)).toBe(true);
    });
});
