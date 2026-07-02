import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import * as speakeasy from "speakeasy";
import request from "supertest";
import { AppModule } from "../src/app.module";

const DEMO_PASSWORD = "Demo1234!";

// TOTP codes are single-use across the whole app: login and signing share one
// replay guard. Tests log in at the current window (offset 0) and sign with
// `+30` so a signer never replays their own login code.
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

    const payload = JSON.parse(
        Buffer.from(
            loginRes.body.accessToken.split(".")[1],
            "base64url",
        ).toString(),
    ) as { sub: string };

    return {
        accessToken: loginRes.body.accessToken as string,
        totpSecret,
        userId: payload.sub,
    };
}

describe("Contracts (e2e)", () => {
    let app: INestApplication;
    let user1Token: string;
    let user2Token: string;
    let user2Id: string;
    let user3Token: string;
    let user3Id: string;
    let user1TotpSecret: string;
    let user2TotpSecret: string;
    let user3TotpSecret: string;
    let contractId: string;
    let twoSignatoryContractId: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
        await app.init();

        const ts = Date.now();
        const user1 = await registerAndLogin(
            app,
            `e2e-contract-u1-${ts}@test.fr`,
        );
        const user2 = await registerAndLogin(
            app,
            `e2e-contract-u2-${ts}@test.fr`,
        );
        const user3 = await registerAndLogin(
            app,
            `e2e-contract-signer3-${ts}@test.fr`,
        );

        user1Token = user1.accessToken;
        user2Token = user2.accessToken;
        user2Id = user2.userId;
        user3Token = user3.accessToken;
        user3Id = user3.userId;
        user1TotpSecret = user1.totpSecret;
        user2TotpSecret = user2.totpSecret;
        user3TotpSecret = user3.totpSecret;
    }, 60000);

    afterAll(async () => {
        await app.close();
    });

    describe("GET /contracts", () => {
        it("returns 401 without token", async () => {
            await request(app.getHttpServer()).get("/contracts").expect(401);
        });

        it("returns an empty array initially", async () => {
            const res = await request(app.getHttpServer())
                .get("/contracts")
                .set("Authorization", `Bearer ${user1Token}`)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
        });
    });

    describe("POST /contracts", () => {
        it("creates a contract with contentHash", async () => {
            const res = await request(app.getHttpServer())
                .post("/contracts")
                .set("Authorization", `Bearer ${user1Token}`)
                .send({
                    title: "Accord de jardinage",
                    content: "Je m'engage à entretenir le jardin.",
                    signatories: [user2Id],
                })
                .expect(201);

            expect(res.body._id).toBeTruthy();
            expect(res.body.contentHash).toMatch(/^[a-f0-9]{64}$/);
            expect(res.body.status).toBe("draft");
            contractId = res.body._id as string;
        });

        it("creates a contract with two signatories for full-sign flow", async () => {
            const user1Payload = JSON.parse(
                Buffer.from(user1Token.split(".")[1], "base64url").toString(),
            ) as { sub: string };

            const res = await request(app.getHttpServer())
                .post("/contracts")
                .set("Authorization", `Bearer ${user1Token}`)
                .send({
                    title: "Contrat double signature",
                    content: "Accord entre les deux parties.",
                    signatories: [user1Payload.sub, user3Id],
                })
                .expect(201);

            expect(res.body._id).toBeTruthy();
            twoSignatoryContractId = res.body._id as string;
        });
    });

    describe("POST /contracts/:id/sign", () => {
        it("returns 403 if user is not a signatory", async () => {
            // user3 signs contract2 only — it has no tie to this contract.
            // Reusing it (vs a fresh login) keeps the file under the login
            // rate limit. The 403 is raised before the TOTP is verified, so
            // the code is never consumed.
            await request(app.getHttpServer())
                .post(`/contracts/${contractId}/sign`)
                .set("Authorization", `Bearer ${user3Token}`)
                .send({ totpCode: currentTotp(user3TotpSecret, 30) })
                .expect(403);
        });

        it("returns 400 for invalid TOTP code", async () => {
            await request(app.getHttpServer())
                .post(`/contracts/${contractId}/sign`)
                .set("Authorization", `Bearer ${user2Token}`)
                .send({ totpCode: "000000" })
                .expect(400);
        });

        it("user2 signs the contract — single signatory completes it", async () => {
            const res = await request(app.getHttpServer())
                .post(`/contracts/${contractId}/sign`)
                .set("Authorization", `Bearer ${user2Token}`)
                .send({ totpCode: currentTotp(user2TotpSecret, 30) })
                .expect(201);

            expect(res.body.signatures).toHaveLength(1);
            expect(res.body.status).toBe("fully_signed");
        });

        it("user2 cannot sign the same contract twice", async () => {
            await request(app.getHttpServer())
                .post(`/contracts/${contractId}/sign`)
                .set("Authorization", `Bearer ${user2Token}`)
                .send({ totpCode: currentTotp(user2TotpSecret, 30) })
                .expect(400);
        });

        it("both signatories sign — status becomes fully_signed", async () => {
            await request(app.getHttpServer())
                .post(`/contracts/${twoSignatoryContractId}/sign`)
                .set("Authorization", `Bearer ${user1Token}`)
                .send({ totpCode: currentTotp(user1TotpSecret, 30) })
                .expect(201);

            const res = await request(app.getHttpServer())
                .post(`/contracts/${twoSignatoryContractId}/sign`)
                .set("Authorization", `Bearer ${user3Token}`)
                .send({ totpCode: currentTotp(user3TotpSecret, 30) })
                .expect(201);

            expect(res.body.status).toBe("fully_signed");
            expect(res.body.signatures).toHaveLength(2);
        });
    });

    describe("TOTP replay across endpoints (security)", () => {
        it("rejects a login TOTP code reused to sign a contract", async () => {
            const email = `e2e-contract-replay-${Date.now()}@test.fr`;
            const regRes = await request(app.getHttpServer())
                .post("/auth/register")
                .send({ email, password: DEMO_PASSWORD })
                .expect(201);
            const secret = new URL(
                regRes.body.otpauthUrl.replace("otpauth://", "http://"),
            ).searchParams.get("secret")!;

            // One code, used first to log in, then reused to sign. Login and
            // signing share a single TotpService, so the second use must be
            // rejected as a replay — a login code is not a signing code.
            const code = currentTotp(secret);

            const loginRes = await request(app.getHttpServer())
                .post("/auth/login")
                .send({ email, password: DEMO_PASSWORD, totpCode: code })
                .expect(200);
            const token = loginRes.body.accessToken as string;
            const userId = (
                JSON.parse(
                    Buffer.from(token.split(".")[1], "base64url").toString(),
                ) as { sub: string }
            ).sub;

            const contractRes = await request(app.getHttpServer())
                .post("/contracts")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    title: "Anti-rejeu TOTP",
                    content: "Le code de connexion ne doit pas signer.",
                    signatories: [userId],
                })
                .expect(201);

            await request(app.getHttpServer())
                .post(`/contracts/${contractRes.body._id}/sign`)
                .set("Authorization", `Bearer ${token}`)
                .send({ totpCode: code })
                .expect(400);
        });
    });

    describe("GET /contracts/:id", () => {
        it("returns the contract for a signatory", async () => {
            const res = await request(app.getHttpServer())
                .get(`/contracts/${contractId}`)
                .set("Authorization", `Bearer ${user2Token}`)
                .expect(200);

            expect(res.body._id).toBe(contractId);
        });

        it("returns 403 for a user with no access", async () => {
            // user3 is neither creator nor signatory of this contract.
            await request(app.getHttpServer())
                .get(`/contracts/${contractId}`)
                .set("Authorization", `Bearer ${user3Token}`)
                .expect(403);
        });

        it("returns 404 for an unknown contract id", async () => {
            await request(app.getHttpServer())
                .get("/contracts/000000000000000000000000")
                .set("Authorization", `Bearer ${user1Token}`)
                .expect(404);
        });
    });
});
