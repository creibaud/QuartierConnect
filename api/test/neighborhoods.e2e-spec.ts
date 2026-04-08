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

describe("Neighborhoods CRUD (e2e)", () => {
    let app: INestApplication;
    let module: TestingModule;
    let userToken: string;
    let adminToken: string;
    let createdNeighborhoodId: string;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = module.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
        await app.init();

        const ts = Date.now();
        const userEmail = `e2e-nbhd-user-${ts}@test.fr`;
        const adminEmail = `e2e-nbhd-admin-${ts}@test.fr`;

        const user = await registerAndLogin(app, userEmail);
        const admin = await registerAndLogin(app, adminEmail);
        userToken = user.accessToken;

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

    describe("GET /neighborhoods", () => {
        it("returns an array (public, no auth required)", async () => {
            const res = await request(app.getHttpServer())
                .get("/neighborhoods")
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
        });

        it("supports pagination via ?page and ?limit", async () => {
            const res = await request(app.getHttpServer())
                .get("/neighborhoods?page=1&limit=5")
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
        });
    });

    describe("POST /neighborhoods", () => {
        it("returns 401 without authentication", async () => {
            await request(app.getHttpServer())
                .post("/neighborhoods")
                .send({ name: "Unauthorized", city: "Paris" })
                .expect(401);
        });

        it("returns 403 for a non-admin user", async () => {
            await request(app.getHttpServer())
                .post("/neighborhoods")
                .set("Authorization", `Bearer ${userToken}`)
                .send({ name: "Forbidden", city: "Paris" })
                .expect(403);
        });

        it("creates a neighborhood (admin)", async () => {
            const res = await request(app.getHttpServer())
                .post("/neighborhoods")
                .set("Authorization", `Bearer ${adminToken}`)
                .send({
                    name: "Belleville E2E",
                    city: "Paris",
                    description: "E2E test neighborhood",
                    coordinates: [48.8714, 2.3848],
                })
                .expect(201);

            expect(res.body._id).toBeTruthy();
            expect(res.body.name).toBe("Belleville E2E");
            expect(res.body.city).toBe("Paris");
            createdNeighborhoodId = res.body._id as string;
        });
    });

    describe("GET /neighborhoods/:id", () => {
        it("returns the created neighborhood", async () => {
            const res = await request(app.getHttpServer())
                .get(`/neighborhoods/${createdNeighborhoodId}`)
                .expect(200);

            expect(res.body.name).toBe("Belleville E2E");
        });

        it("returns 404 for an unknown id", async () => {
            await request(app.getHttpServer())
                .get("/neighborhoods/000000000000000000000000")
                .expect(404);
        });
    });

    describe("PATCH /neighborhoods/:id", () => {
        it("returns 403 for a non-admin user", async () => {
            await request(app.getHttpServer())
                .patch(`/neighborhoods/${createdNeighborhoodId}`)
                .set("Authorization", `Bearer ${userToken}`)
                .send({ description: "Hijacked" })
                .expect(403);
        });

        it("updates the neighborhood (admin)", async () => {
            const res = await request(app.getHttpServer())
                .patch(`/neighborhoods/${createdNeighborhoodId}`)
                .set("Authorization", `Bearer ${adminToken}`)
                .send({ description: "Updated by E2E test" })
                .expect(200);

            expect(res.body.description).toBe("Updated by E2E test");
        });

        it("returns 404 when patching an unknown id", async () => {
            await request(app.getHttpServer())
                .patch("/neighborhoods/000000000000000000000000")
                .set("Authorization", `Bearer ${adminToken}`)
                .send({ description: "Ghost" })
                .expect(404);
        });
    });

    describe("DELETE /neighborhoods/:id", () => {
        it("returns 403 for a non-admin user", async () => {
            await request(app.getHttpServer())
                .delete(`/neighborhoods/${createdNeighborhoodId}`)
                .set("Authorization", `Bearer ${userToken}`)
                .expect(403);
        });

        it("deletes the neighborhood (admin)", async () => {
            const res = await request(app.getHttpServer())
                .delete(`/neighborhoods/${createdNeighborhoodId}`)
                .set("Authorization", `Bearer ${adminToken}`)
                .expect(200);

            expect(res.body.success).toBe(true);
        });

        it("returns 404 after deletion", async () => {
            await request(app.getHttpServer())
                .get(`/neighborhoods/${createdNeighborhoodId}`)
                .expect(404);
        });

        it("returns 404 when deleting an unknown id", async () => {
            await request(app.getHttpServer())
                .delete("/neighborhoods/000000000000000000000000")
                .set("Authorization", `Bearer ${adminToken}`)
                .expect(404);
        });
    });
});
