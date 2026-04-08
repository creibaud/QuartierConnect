import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ThrottlerStorage } from "@nestjs/throttler";
import { eq } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as jwt from "jsonwebtoken";
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
): Promise<{ accessToken: string; refreshToken: string; totpSecret: string }> {
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
        accessToken: loginRes.body.accessToken,
        refreshToken: loginRes.body.refreshToken,
        totpSecret,
    };
}

describe("Auth (e2e)", () => {
    let app: INestApplication;
    let registeredEmail: string;
    let totpSecret: string;
    let throttlerStorage: { storage: Map<string, unknown> };

    let primaryAccessToken: string;
    let disposableAccessToken: string;
    let disposableRefreshToken: string;
    let refreshTestRefreshToken: string;
    let preMintedSsoToken: string;
    let preMintedSsoTokenForAlreadyUsed: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
        await app.init();

        const ts = Date.now();
        const email1 = `e2e-primary-${ts}@test.fr`;
        const email2 = `e2e-disposable-${ts}@test.fr`;

        const primary = await registerAndLogin(app, email1);
        primaryAccessToken = primary.accessToken;
        totpSecret = primary.totpSecret;
        registeredEmail = email1;

        const disposable = await registerAndLogin(app, email2);
        disposableAccessToken = disposable.accessToken;
        disposableRefreshToken = disposable.refreshToken;

        // Dedicated user for refresh test — avoids TOTP replay exhaustion on the primary user.
        const email3 = `e2e-refresh-${ts}@test.fr`;
        const refresh = await registerAndLogin(app, email3);
        refreshTestRefreshToken = refresh.refreshToken;

        const db =
            moduleFixture.get<PostgresJsDatabase<typeof schema>>(DRIZZLE_TOKEN);
        await db
            .update(schema.users)
            .set({ role: "admin" })
            .where(eq(schema.users.email, email1));

        const adminLogin = await request(app.getHttpServer())
            .post("/auth/login")
            .send({
                email: email1,
                password: DEMO_PASSWORD,
                totpCode: currentTotp(totpSecret, 30),
            })
            .expect(200);
        primaryAccessToken = adminLogin.body.accessToken;

        throttlerStorage = moduleFixture.get(ThrottlerStorage);

        const ssoGen1 = await request(app.getHttpServer())
            .post("/auth/sso/generate")
            .set("Authorization", `Bearer ${primaryAccessToken}`)
            .send({ surface: "java-desktop" })
            .expect(201);
        preMintedSsoToken = ssoGen1.body.ssoToken;

        const ssoGen2 = await request(app.getHttpServer())
            .post("/auth/sso/generate")
            .set("Authorization", `Bearer ${primaryAccessToken}`)
            .send({ surface: "java-desktop" })
            .expect(201);
        preMintedSsoTokenForAlreadyUsed = ssoGen2.body.ssoToken;
    }, 30000);

    afterAll(async () => {
        await app.close();
    });

    describe("GET /health", () => {
        it("returns status ok", () => {
            return request(app.getHttpServer())
                .get("/health")
                .expect(200)
                .expect((res) => {
                    expect(res.body.status).toBe("ok");
                });
        });
    });

    describe("POST /auth/register", () => {
        it("returns otpauthUrl and no totpSecret in body", async () => {
            const res = await request(app.getHttpServer())
                .post("/auth/register")
                .send({
                    email: `new-${Date.now()}@test.fr`,
                    password: DEMO_PASSWORD,
                })
                .expect(201);

            expect(res.body.otpauthUrl).toBeTruthy();
            expect(JSON.stringify(res.body)).not.toContain("totpSecret");
        });

        it("returns 409 on duplicate email", async () => {
            const res = await request(app.getHttpServer())
                .post("/auth/register")
                .send({ email: registeredEmail, password: DEMO_PASSWORD })
                .expect(409);

            expect(res.body.code).toBe("EMAIL_ALREADY_EXISTS");
        });
    });

    describe("POST /auth/login", () => {
        beforeEach(() => {
            throttlerStorage.storage.clear();
        });

        it("returns JWT pair for valid credentials + TOTP", async () => {
            const res = await request(app.getHttpServer())
                .post("/auth/login")
                .send({
                    email: registeredEmail,
                    password: DEMO_PASSWORD,
                    totpCode: currentTotp(totpSecret, -30),
                })
                .expect(200);

            expect(res.body.accessToken).toBeTruthy();
            expect(res.body.refreshToken).toBeTruthy();
        });

        it("returns 401 for wrong password", async () => {
            const res = await request(app.getHttpServer())
                .post("/auth/login")
                .send({
                    email: registeredEmail,
                    password: "WrongPass!",
                    totpCode: currentTotp(totpSecret),
                })
                .expect(401);

            expect(res.body.code).toBe("INVALID_PASSWORD");
        });

        it("returns 401 for wrong TOTP", async () => {
            const res = await request(app.getHttpServer())
                .post("/auth/login")
                .send({
                    email: registeredEmail,
                    password: DEMO_PASSWORD,
                    totpCode: "000000",
                })
                .expect(401);

            expect(res.body.code).toBe("INVALID_TOTP");
        });

        it("returns 429 after 5 failed login attempts", async () => {
            const uniqueEmail = `ratelimit-${Date.now()}@test.fr`;
            for (let i = 0; i < 5; i++) {
                await request(app.getHttpServer()).post("/auth/login").send({
                    email: uniqueEmail,
                    password: "bad",
                    totpCode: "000000",
                });
            }
            const res = await request(app.getHttpServer())
                .post("/auth/login")
                .send({
                    email: uniqueEmail,
                    password: "bad",
                    totpCode: "000000",
                });

            expect(res.status).toBe(429);
        });
    });

    describe("POST /auth/refresh", () => {
        it("returns new access token for valid refresh token", async () => {
            const res = await request(app.getHttpServer())
                .post("/auth/refresh")
                .send({ refreshToken: refreshTestRefreshToken })
                .expect(200);

            expect(res.body.accessToken).toBeTruthy();
        });

        it("returns 401 for revoked refresh token", async () => {
            await request(app.getHttpServer())
                .post("/auth/logout")
                .set("Authorization", `Bearer ${disposableAccessToken}`)
                .send({ refreshToken: disposableRefreshToken })
                .expect(200);

            const res = await request(app.getHttpServer())
                .post("/auth/refresh")
                .send({ refreshToken: disposableRefreshToken });

            expect(res.status).toBe(401);
        });
    });

    describe("SSO flow", () => {
        it("sso/generate returns ssoToken + expiresIn 300", async () => {
            const res = await request(app.getHttpServer())
                .post("/auth/sso/generate")
                .set("Authorization", `Bearer ${primaryAccessToken}`)
                .send({ surface: "java-desktop" })
                .expect(201);

            expect(res.body.ssoToken).toBeTruthy();
            expect(res.body.expiresIn).toBe(300);
            expect(new Date(res.body.expiresAt).getTime()).toBeGreaterThan(
                Date.now(),
            );
        });

        it("sso/exchange returns JWT pair for valid token", async () => {
            const res = await request(app.getHttpServer())
                .post("/auth/sso/exchange")
                .send({ ssoToken: preMintedSsoToken })
                .expect(200);

            expect(res.body.accessToken).toBeTruthy();
        });

        it("sso/exchange returns 401 for already-used token", async () => {
            await request(app.getHttpServer())
                .post("/auth/sso/exchange")
                .send({ ssoToken: preMintedSsoTokenForAlreadyUsed })
                .expect(200);

            const res = await request(app.getHttpServer())
                .post("/auth/sso/exchange")
                .send({ ssoToken: preMintedSsoTokenForAlreadyUsed });

            expect(res.status).toBe(401);
        });

        it("sso/exchange returns 401 for non-existent token", async () => {
            const res = await request(app.getHttpServer())
                .post("/auth/sso/exchange")
                .send({ ssoToken: "00000000-0000-4000-a000-000000000000" });

            expect(res.status).toBe(401);
        });
    });

    describe("Expired access token", () => {
        it("returns 401 for an expired access token on a protected endpoint", async () => {
            const secret = process.env.JWT_SECRET ?? "test-secret";
            const expiredToken = jwt.sign(
                {
                    sub: "00000000-0000-4000-a000-000000000001",
                    email: "expired@test.fr",
                    role: "resident",
                    exp: Math.floor(Date.now() / 1000) - 60,
                },
                secret,
            );

            const res = await request(app.getHttpServer())
                .get("/users/me/export")
                .set("Authorization", `Bearer ${expiredToken}`);

            expect(res.status).toBe(401);
        });
    });
});
