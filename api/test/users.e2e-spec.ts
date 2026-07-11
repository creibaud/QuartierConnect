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

describe("Users list contract (e2e)", () => {
    let app: INestApplication;
    let module: TestingModule;
    let adminToken: string;
    const token = `zzq${Date.now()}`;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = module.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
        await app.init();

        const adminEmail = `e2e-users-admin-${Date.now()}@test.fr`;
        const admin = await registerAndLogin(app, adminEmail);

        const db = module.get<PostgresJsDatabase<typeof schema>>(DRIZZLE_TOKEN);
        await db
            .update(schema.users)
            .set({ role: "admin" })
            .where(eq(schema.users.email, adminEmail));

        // Seed fixtures straight into Postgres to avoid the login throttle.
        await db.insert(schema.users).values([
            {
                email: `${token}-charlie@test.fr`,
                passwordHash: "x",
                totpSecret: "x",
            },
            {
                email: `${token}-alpha@test.fr`,
                passwordHash: "x",
                totpSecret: "x",
            },
            {
                email: `${token}-bravo@test.fr`,
                passwordHash: "x",
                totpSecret: "x",
            },
        ]);

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

    it("reports the total user count for pagination", async () => {
        const res = await request(app.getHttpServer())
            .get("/users?limit=5")
            .set("Authorization", `Bearer ${adminToken}`)
            .expect(200);
        expect(Number(res.headers["x-total-count"])).toBeGreaterThanOrEqual(
            res.body.length,
        );
        expect(res.headers["x-total-pages"]).toBeDefined();
    });

    it("searches email across every page and reports the total", async () => {
        const res = await request(app.getHttpServer())
            .get(`/users?search=${token}&limit=100`)
            .set("Authorization", `Bearer ${adminToken}`)
            .expect(200);
        expect(res.headers["x-total-count"]).toBe("3");
        expect(res.body).toHaveLength(3);
        expect(
            res.body.every((u: { email: string }) => u.email.includes(token)),
        ).toBe(true);
    });

    it("sorts by email ascending when asked", async () => {
        const res = await request(app.getHttpServer())
            .get(`/users?search=${token}&sort=email&order=asc&limit=100`)
            .set("Authorization", `Bearer ${adminToken}`)
            .expect(200);
        const emails = res.body.map((u: { email: string }) => u.email);
        expect(emails).toEqual([
            `${token}-alpha@test.fr`,
            `${token}-bravo@test.fr`,
            `${token}-charlie@test.fr`,
        ]);
    });
});
