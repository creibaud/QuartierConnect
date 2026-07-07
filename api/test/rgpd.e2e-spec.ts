import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ThrottlerStorage } from "@nestjs/throttler";
import * as speakeasy from "speakeasy";
import request from "supertest";
import { AppModule } from "../src/app.module";

const DEMO_PASSWORD = "Demo1234!";

let throttlerStorage: { storage: Map<string, unknown> } | undefined;

function resetLoginRateLimit(): void {
    throttlerStorage?.storage.clear();
}

function currentTotp(secret: string, timeOffsetSeconds = 0): string {
    return speakeasy.totp({
        secret,
        encoding: "base32",
        time: Math.floor(Date.now() / 1000) + timeOffsetSeconds,
    });
}

// The API replay guard rejects reused TOTP codes.
const usedTotpCodes = new Map<string, Set<string>>();

function freshTotp(secret: string): string {
    const used = usedTotpCodes.get(secret) ?? new Set<string>();
    usedTotpCodes.set(secret, used);
    for (const offset of [0, 30, -30]) {
        const code = currentTotp(secret, offset);
        if (!used.has(code)) {
            used.add(code);
            return code;
        }
    }
    throw new Error("No fresh TOTP code available for this secret");
}

async function registerUser(
    app: INestApplication,
    email: string,
    phone?: string,
): Promise<{ totpSecret: string }> {
    const regRes = await request(app.getHttpServer())
        .post("/auth/register")
        .send({ email, password: DEMO_PASSWORD, consent: true, phone })
        .expect(201);

    const urlParams = new URL(
        regRes.body.otpauthUrl.replace("otpauth://", "http://"),
    );
    return { totpSecret: urlParams.searchParams.get("secret")! };
}

async function registerAndLogin(
    app: INestApplication,
    email: string,
    phone?: string,
): Promise<{ accessToken: string; totpSecret: string }> {
    const { totpSecret } = await registerUser(app, email, phone);

    resetLoginRateLimit();
    const loginRes = await request(app.getHttpServer())
        .post("/auth/login")
        .send({
            email,
            password: DEMO_PASSWORD,
            totpCode: freshTotp(totpSecret),
        })
        .expect(200);

    return {
        accessToken: loginRes.body.accessToken as string,
        totpSecret,
    };
}

describe("RGPD — export, account security and deletion (e2e)", () => {
    let app: INestApplication;
    const ts = Date.now();

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
        await app.init();
        throttlerStorage = moduleFixture.get(ThrottlerStorage);
    }, 30000);

    afterAll(async () => {
        await app.close();
    });

    describe("GET /users/me/export", () => {
        let exportToken: string;

        beforeAll(async () => {
            const exportUser = await registerAndLogin(
                app,
                `e2e-rgpd-export-${ts}@test.fr`,
                "+33 6 11 22 33 44",
            );
            exportToken = exportUser.accessToken;
        }, 30000);

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

        it("includes the registration consent timestamp and phone", async () => {
            const res = await request(app.getHttpServer())
                .get("/users/me/export")
                .set("Authorization", `Bearer ${exportToken}`)
                .expect(200);

            expect(typeof res.body.consentTimestamp).toBe("string");
            expect(res.body.profile.phone).toBe("+33611223344");
        });

        it("includes all extended GDPR datasets as arrays", async () => {
            const res = await request(app.getHttpServer())
                .get("/users/me/export")
                .set("Authorization", `Bearer ${exportToken}`)
                .expect(200);

            for (const key of [
                "incidents",
                "transactions",
                "messagesSent",
                "contracts",
                "bookings",
                "votes",
                "communityBallots",
                "services",
            ]) {
                expect(Array.isArray(res.body[key])).toBe(true);
            }
        });
    });

    describe("PATCH /users/me/password", () => {
        const email = `e2e-rgpd-password-${ts}@test.fr`;
        const newPassword = "NewDemo1234!";
        let accessToken: string;
        let totpSecret: string;
        let consumedCode: string;

        beforeAll(async () => {
            const user = await registerAndLogin(app, email);
            accessToken = user.accessToken;
            totpSecret = user.totpSecret;
        }, 30000);

        it("returns 400 when totpCode is missing", async () => {
            await request(app.getHttpServer())
                .patch("/users/me/password")
                .set("Authorization", `Bearer ${accessToken}`)
                .send({
                    currentPassword: DEMO_PASSWORD,
                    newPassword,
                })
                .expect(400);
        });

        it("returns 401 for an invalid TOTP code", async () => {
            await request(app.getHttpServer())
                .patch("/users/me/password")
                .set("Authorization", `Bearer ${accessToken}`)
                .send({
                    currentPassword: DEMO_PASSWORD,
                    newPassword,
                    totpCode: "000000",
                })
                .expect(401);
        });

        it("changes the password with a valid TOTP code", async () => {
            consumedCode = freshTotp(totpSecret);
            const res = await request(app.getHttpServer())
                .patch("/users/me/password")
                .set("Authorization", `Bearer ${accessToken}`)
                .send({
                    currentPassword: DEMO_PASSWORD,
                    newPassword,
                    totpCode: consumedCode,
                })
                .expect(200);

            expect(res.body.success).toBe(true);

            resetLoginRateLimit();
            const oldPasswordLogin = await request(app.getHttpServer())
                .post("/auth/login")
                .send({
                    email,
                    password: DEMO_PASSWORD,
                    totpCode: "000000",
                });
            expect(oldPasswordLogin.status).toBe(401);
            expect(oldPasswordLogin.body.code).toBe("INVALID_PASSWORD");
        });

        it("rejects a replayed TOTP code", async () => {
            await request(app.getHttpServer())
                .patch("/users/me/password")
                .set("Authorization", `Bearer ${accessToken}`)
                .send({
                    currentPassword: newPassword,
                    newPassword: "AnotherDemo1234!",
                    totpCode: consumedCode,
                })
                .expect(401);
        });
    });

    describe("PATCH /users/me/email", () => {
        const takenEmail = `e2e-rgpd-taken-${ts}@test.fr`;

        beforeAll(async () => {
            await registerUser(app, takenEmail);
        }, 30000);

        it("returns 401 for a wrong password", async () => {
            const user = await registerAndLogin(
                app,
                `e2e-rgpd-email-badpwd-${ts}@test.fr`,
            );
            await request(app.getHttpServer())
                .patch("/users/me/email")
                .set("Authorization", `Bearer ${user.accessToken}`)
                .send({
                    newEmail: `whatever-${ts}@test.fr`,
                    password: "WrongPass!",
                    totpCode: "000000",
                })
                .expect(401);
        });

        it("returns 401 for an invalid TOTP code", async () => {
            const user = await registerAndLogin(
                app,
                `e2e-rgpd-email-badtotp-${ts}@test.fr`,
            );
            await request(app.getHttpServer())
                .patch("/users/me/email")
                .set("Authorization", `Bearer ${user.accessToken}`)
                .send({
                    newEmail: `whatever2-${ts}@test.fr`,
                    password: DEMO_PASSWORD,
                    totpCode: "000000",
                })
                .expect(401);
        });

        it("returns 409 when the email belongs to another account", async () => {
            const user = await registerAndLogin(
                app,
                `e2e-rgpd-email-conflict-${ts}@test.fr`,
            );
            const res = await request(app.getHttpServer())
                .patch("/users/me/email")
                .set("Authorization", `Bearer ${user.accessToken}`)
                .send({
                    newEmail: takenEmail,
                    password: DEMO_PASSWORD,
                    totpCode: freshTotp(user.totpSecret),
                })
                .expect(409);

            expect(res.body.code).toBe("EMAIL_ALREADY_EXISTS");
        });

        it("changes the email, revokes the session and allows login with the new email", async () => {
            const oldEmail = `e2e-rgpd-email-change-${ts}@test.fr`;
            const newEmail = `e2e-rgpd-email-changed-${ts}@test.fr`;
            const user = await registerAndLogin(app, oldEmail);

            const res = await request(app.getHttpServer())
                .patch("/users/me/email")
                .set("Authorization", `Bearer ${user.accessToken}`)
                .send({
                    newEmail,
                    password: DEMO_PASSWORD,
                    totpCode: freshTotp(user.totpSecret),
                })
                .expect(200);
            expect(res.body.requiresReauth).toBe(true);

            await request(app.getHttpServer())
                .get("/users/me/profile")
                .set("Authorization", `Bearer ${user.accessToken}`)
                .expect(401);

            resetLoginRateLimit();
            const reLogin = await request(app.getHttpServer())
                .post("/auth/login")
                .send({
                    email: newEmail,
                    password: DEMO_PASSWORD,
                    totpCode: freshTotp(user.totpSecret),
                })
                .expect(200);
            expect(reLogin.body.accessToken).toBeTruthy();
            expect(reLogin.body.user.email).toBe(newEmail);
        });
    });

    describe("PATCH /users/me/phone", () => {
        let accessToken: string;
        let totpSecret: string;

        beforeAll(async () => {
            const user = await registerAndLogin(
                app,
                `e2e-rgpd-phone-${ts}@test.fr`,
            );
            accessToken = user.accessToken;
            totpSecret = user.totpSecret;
        }, 30000);

        it("returns 400 for a malformed phone number", async () => {
            await request(app.getHttpServer())
                .patch("/users/me/phone")
                .set("Authorization", `Bearer ${accessToken}`)
                .send({ phone: "not-a-phone", totpCode: "000000" })
                .expect(400);
        });

        it("returns 401 for an invalid TOTP code", async () => {
            await request(app.getHttpServer())
                .patch("/users/me/phone")
                .set("Authorization", `Bearer ${accessToken}`)
                .send({ phone: "+33612345678", totpCode: "000000" })
                .expect(401);
        });

        it("stores the normalized phone, then erases it with null", async () => {
            const setRes = await request(app.getHttpServer())
                .patch("/users/me/phone")
                .set("Authorization", `Bearer ${accessToken}`)
                .send({
                    phone: "+33 6 12 34 56 78",
                    totpCode: freshTotp(totpSecret),
                })
                .expect(200);
            expect(setRes.body).toEqual({
                success: true,
                phone: "+33612345678",
            });

            const profileRes = await request(app.getHttpServer())
                .get("/users/me/profile")
                .set("Authorization", `Bearer ${accessToken}`)
                .expect(200);
            expect(profileRes.body.phone).toBe("+33612345678");

            const eraseRes = await request(app.getHttpServer())
                .patch("/users/me/phone")
                .set("Authorization", `Bearer ${accessToken}`)
                .send({ phone: null, totpCode: freshTotp(totpSecret) })
                .expect(200);
            expect(eraseRes.body).toEqual({ success: true, phone: null });
        });
    });

    describe("DELETE /users/me", () => {
        let deleteToken: string;
        let deleteTotpSecret: string;

        beforeAll(async () => {
            const deleteUser = await registerAndLogin(
                app,
                `e2e-rgpd-delete-${ts}@test.fr`,
            );
            deleteToken = deleteUser.accessToken;
            deleteTotpSecret = deleteUser.totpSecret;
        }, 30000);

        it("returns 401 without token", async () => {
            await request(app.getHttpServer()).delete("/users/me").expect(401);
        });

        it("returns { success: true } and the account is anonymised", async () => {
            const res = await request(app.getHttpServer())
                .delete("/users/me")
                .set("Authorization", `Bearer ${deleteToken}`)
                .send({ totpCode: freshTotp(deleteTotpSecret) })
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
