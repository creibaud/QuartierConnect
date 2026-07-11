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

describe("Services list contract (e2e)", () => {
    let app: INestApplication;
    let module: TestingModule;
    let adminToken: string;
    const token = `zzq${Date.now()}`;

    async function createService(title: string): Promise<void> {
        await request(app.getHttpServer())
            .post("/services")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                title,
                description: `desc ${title}`,
                category: "gardening",
                type: "free",
                direction: "offer",
            })
            .expect(201);
    }

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = module.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
        await app.init();

        const adminEmail = `e2e-svc-list-admin-${Date.now()}@test.fr`;
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

        // Created out of alphabetical order to prove title sort is server-side.
        await createService(`${token}-bravo`);
        await createService(`${token}-alpha`);
        await createService(`${token}-charlie`);
    }, 60000);

    afterAll(async () => {
        await app.close();
    });

    it("searches title/description across every page and reports the total", async () => {
        const paged = await request(app.getHttpServer())
            .get(`/services?search=${token}&limit=2`)
            .set("Authorization", `Bearer ${adminToken}`)
            .expect(200);
        expect(paged.headers["x-total-count"]).toBe("3");
        expect(paged.headers["x-total-pages"]).toBe("2");
        expect(paged.body).toHaveLength(2);

        const all = await request(app.getHttpServer())
            .get(`/services?search=${token}&limit=100`)
            .set("Authorization", `Bearer ${adminToken}`)
            .expect(200);
        expect(all.body).toHaveLength(3);
        expect(
            all.body.every((s: { title: string }) => s.title.includes(token)),
        ).toBe(true);
    });

    it("sorts by title ascending when asked", async () => {
        const res = await request(app.getHttpServer())
            .get(`/services?search=${token}&sort=title&order=asc&limit=100`)
            .set("Authorization", `Bearer ${adminToken}`)
            .expect(200);
        const titles = res.body.map((s: { title: string }) => s.title);
        expect(titles).toEqual([
            `${token}-alpha`,
            `${token}-bravo`,
            `${token}-charlie`,
        ]);
    });

    it("treats regex metacharacters in search as literal", async () => {
        const res = await request(app.getHttpServer())
            .get(`/services?search=${token}.*&limit=100`)
            .set("Authorization", `Bearer ${adminToken}`)
            .expect(200);
        // ".*" is escaped, so it only matches a literal ".*" — none exist.
        expect(res.headers["x-total-count"]).toBe("0");
        expect(res.body).toHaveLength(0);
    });
});
