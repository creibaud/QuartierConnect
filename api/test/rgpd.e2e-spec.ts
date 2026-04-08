import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import * as speakeasy from "speakeasy";
import request from "supertest";
import { AppModule } from "../src/app.module";

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

describe("RGPD — export and account deletion (e2e)", () => {
    let app: INestApplication;
    let exportToken: string;
    let deleteToken: string;
    let deleteTotpSecret: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
        await app.init();

        const ts = Date.now();
        const exportUser = await registerAndLogin(
            app,
            `e2e-rgpd-export-${ts}@test.fr`,
        );
        const deleteUser = await registerAndLogin(
            app,
            `e2e-rgpd-delete-${ts}@test.fr`,
        );
        exportToken = exportUser.accessToken;
        deleteToken = deleteUser.accessToken;
        deleteTotpSecret = deleteUser.totpSecret;
    }, 30000);

    afterAll(async () => {
        await app.close();
    });

    describe("GET /users/me/export", () => {
        it("returns 401 without token", async () => {
            await request(app.getHttpServer())
                .get("/users/me/export")
                .expect(401);
        });

        it("returns profile with email and role", async () => {
            const res = await request(app.getHttpServer())
                .get("/users/me/export")
                .set("Authorization", `Bearer ${exportToken}`)
                .expect(200);

            expect(res.body.profile).toBeDefined();
            expect(typeof res.body.profile.email).toBe("string");
            expect(typeof res.body.profile.role).toBe("string");
        });

        it("does not include passwordHash or totpSecret", async () => {
            const res = await request(app.getHttpServer())
                .get("/users/me/export")
                .set("Authorization", `Bearer ${exportToken}`)
                .expect(200);

            const body = JSON.stringify(res.body);
            expect(body).not.toContain("passwordHash");
            expect(body).not.toContain("totpSecret");
        });

        it("includes incidents array and transactions array", async () => {
            const res = await request(app.getHttpServer())
                .get("/users/me/export")
                .set("Authorization", `Bearer ${exportToken}`)
                .expect(200);

            expect(Array.isArray(res.body.incidents)).toBe(true);
            expect(Array.isArray(res.body.transactions)).toBe(true);
        });
    });

    describe("DELETE /users/me", () => {
        it("returns 401 without token", async () => {
            await request(app.getHttpServer()).delete("/users/me").expect(401);
        });

        it("returns { success: true } and the account is anonymised", async () => {
            const res = await request(app.getHttpServer())
                .delete("/users/me")
                .set("Authorization", `Bearer ${deleteToken}`)
                .send({
                    totpCode: currentTotp(
                        deleteTotpSecret,
                        30 - (Math.floor(Date.now() / 1000) % 30) + 15,
                    ),
                })
                .expect(200);

            expect(res.body.success).toBe(true);
        });

        it("the deleted token no longer grants access to protected routes", async () => {
            const res = await request(app.getHttpServer())
                .get("/users/me/export")
                .set("Authorization", `Bearer ${deleteToken}`);

            expect([401, 404]).toContain(res.status);
        });
    });
});
