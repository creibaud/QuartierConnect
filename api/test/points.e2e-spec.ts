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

describe("Points (e2e)", () => {
    let app: INestApplication;
    let senderToken: string;
    let recipientToken: string;
    let recipientId: string;
    let ownerToken: string;
    let buyerToken: string;
    let ownerTotp: string;
    let buyerTotp: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
        await app.init();

        const ts = Date.now();
        const sender = await registerAndLogin(
            app,
            `e2e-points-sender-${ts}@test.fr`,
        );
        const recipient = await registerAndLogin(
            app,
            `e2e-points-recipient-${ts}@test.fr`,
        );
        const owner = await registerAndLogin(
            app,
            `e2e-points-owner-${ts}@test.fr`,
        );
        const buyer = await registerAndLogin(
            app,
            `e2e-points-buyer-${ts}@test.fr`,
        );

        senderToken = sender.accessToken;
        recipientToken = recipient.accessToken;
        recipientId = recipient.userId;
        ownerToken = owner.accessToken;
        buyerToken = buyer.accessToken;
        ownerTotp = owner.totpSecret;
        buyerTotp = buyer.totpSecret;
    }, 30000);

    afterAll(async () => {
        await app.close();
    });

    describe("GET /points/balance", () => {
        it("returns 401 without token", async () => {
            await request(app.getHttpServer())
                .get("/points/balance")
                .expect(401);
        });

        it("returns a numeric balance for an authenticated user", async () => {
            const res = await request(app.getHttpServer())
                .get("/points/balance")
                .set("Authorization", `Bearer ${senderToken}`)
                .expect(200);

            expect(typeof res.body.balance).toBe("number");
        });
    });

    describe("GET /points/history", () => {
        it("returns an array of transactions", async () => {
            const res = await request(app.getHttpServer())
                .get("/points/history")
                .set("Authorization", `Bearer ${senderToken}`)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
        });
    });

    describe("POST /points/transfer", () => {
        it("returns 400 when transferring to self", async () => {
            const senderPayload = JSON.parse(
                Buffer.from(senderToken.split(".")[1], "base64url").toString(),
            ) as { sub: string };

            const res = await request(app.getHttpServer())
                .post("/points/transfer")
                .set("Authorization", `Bearer ${senderToken}`)
                .send({ recipientId: senderPayload.sub, amount: 1 })
                .expect(400);

            expect(res.body.message).toBeTruthy();
        });

        it("returns 400 when amount would push balance below -10", async () => {
            const res = await request(app.getHttpServer())
                .post("/points/transfer")
                .set("Authorization", `Bearer ${senderToken}`)
                .send({ recipientId, amount: 9999 })
                .expect(400);

            expect(res.body.message).toMatch(/insufficient/i);
        });

        it("transfers points when the recipient starts with a zero balance", async () => {
            const recipientBefore = await request(app.getHttpServer())
                .get("/points/balance")
                .set("Authorization", `Bearer ${recipientToken}`)
                .expect(200);

            const balanceBefore = recipientBefore.body.balance as number;

            await request(app.getHttpServer())
                .post("/points/transfer")
                .set("Authorization", `Bearer ${senderToken}`)
                .send({ recipientId, amount: 2, note: "E2E test" })
                .expect(201);

            const recipientAfter = await request(app.getHttpServer())
                .get("/points/balance")
                .set("Authorization", `Bearer ${recipientToken}`)
                .expect(200);

            expect(recipientAfter.body.balance).toBe(balanceBefore + 2);
        });

        it("sender balance decreases after transfer", async () => {
            const senderBefore = await request(app.getHttpServer())
                .get("/points/balance")
                .set("Authorization", `Bearer ${senderToken}`)
                .expect(200);

            const balanceBefore = senderBefore.body.balance as number;

            await request(app.getHttpServer())
                .post("/points/transfer")
                .set("Authorization", `Bearer ${senderToken}`)
                .send({ recipientId, amount: 1 })
                .expect(201);

            const senderAfter = await request(app.getHttpServer())
                .get("/points/balance")
                .set("Authorization", `Bearer ${senderToken}`)
                .expect(200);

            expect(senderAfter.body.balance).toBe(balanceBefore - 1);
        });

        it("transaction appears in sender history", async () => {
            const res = await request(app.getHttpServer())
                .get("/points/history")
                .set("Authorization", `Bearer ${senderToken}`)
                .expect(200);

            expect(res.body.length).toBeGreaterThan(0);
        });

        it("transaction appears in recipient history", async () => {
            const res = await request(app.getHttpServer())
                .get("/points/history")
                .set("Authorization", `Bearer ${recipientToken}`)
                .expect(200);

            expect(res.body.length).toBeGreaterThan(0);
        });
    });

    describe("Settlement respects the -10 floor", () => {
        it("second signature is rejected when the payer cannot afford it (-10 floor)", async () => {
            // owner offers an expensive paid service (20 points)
            const svc = await request(app.getHttpServer())
                .post("/services")
                .set("Authorization", `Bearer ${ownerToken}`)
                .send({
                    title: "Expensive help",
                    description: "Costly",
                    category: "other",
                    type: "paid",
                    direction: "offer",
                    duration: 60,
                    pointsMultiplier: 10,
                })
                .expect(201);

            const booking = await request(app.getHttpServer())
                .post("/bookings")
                .set("Authorization", `Bearer ${buyerToken}`)
                .send({ serviceId: svc.body._id })
                .expect(201);
            const accepted = await request(app.getHttpServer())
                .post(`/bookings/${booking.body._id}/accept`)
                .set("Authorization", `Bearer ${ownerToken}`)
                .expect(201);
            const contractId = accepted.body.contractId as string;

            // payer signs first (partial), then payee's completing signature must 400
            await request(app.getHttpServer())
                .post(`/contracts/${contractId}/sign`)
                .set("Authorization", `Bearer ${buyerToken}`)
                .send({ totpCode: currentTotp(buyerTotp) })
                .expect(201);
            await request(app.getHttpServer())
                .post(`/contracts/${contractId}/sign`)
                .set("Authorization", `Bearer ${ownerToken}`)
                .send({ totpCode: currentTotp(ownerTotp, 30) })
                .expect(400);

            // balance unchanged
            const bal = await request(app.getHttpServer())
                .get("/points/balance")
                .set("Authorization", `Bearer ${buyerToken}`)
                .expect(200);
            expect(bal.body.balance).toBe(0);
        });
    });
});
