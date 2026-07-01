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

describe("Paid service settlement (e2e)", () => {
    let app: INestApplication;
    let owner: { accessToken: string; totpSecret: string; userId: string };
    let buyer: { accessToken: string; totpSecret: string; userId: string };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();
        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
        await app.init();
        const ts = Date.now();
        owner = await registerAndLogin(app, `pay-owner-${ts}@test.fr`);
        buyer = await registerAndLogin(app, `pay-buyer-${ts}@test.fr`);
    }, 60000);

    afterAll(async () => {
        await app.close();
    });

    it("book → accept → double-sign → points move", async () => {
        const svc = await request(app.getHttpServer())
            .post("/services")
            .set("Authorization", `Bearer ${owner.accessToken}`)
            .send({
                title: "Paid gardening",
                description: "One hour",
                category: "gardening",
                type: "paid",
                direction: "offer",
                duration: 60,
            })
            .expect(201);

        const booking = await request(app.getHttpServer())
            .post("/bookings")
            .set("Authorization", `Bearer ${buyer.accessToken}`)
            .send({ serviceId: svc.body._id })
            .expect(201);

        const accepted = await request(app.getHttpServer())
            .post(`/bookings/${booking.body._id}/accept`)
            .set("Authorization", `Bearer ${owner.accessToken}`)
            .expect(201);
        const contractId = accepted.body.contractId as string;

        // No balance movement yet (payment is pending).
        const buyerBalance0 = await request(app.getHttpServer())
            .get("/points/balance")
            .set("Authorization", `Bearer ${buyer.accessToken}`)
            .expect(200);
        expect(buyerBalance0.body.balance).toBe(0);

        // Buyer (payer) signs first → partial.
        const partial = await request(app.getHttpServer())
            .post(`/contracts/${contractId}/sign`)
            .set("Authorization", `Bearer ${buyer.accessToken}`)
            .send({ totpCode: currentTotp(buyer.totpSecret) })
            .expect(201);
        expect(partial.body.status).toBe("partial");

        // Owner (payee) signs → fully_signed + settlement.
        const full = await request(app.getHttpServer())
            .post(`/contracts/${contractId}/sign`)
            .set("Authorization", `Bearer ${owner.accessToken}`)
            .send({ totpCode: currentTotp(owner.totpSecret, 30) })
            .expect(201);
        expect(full.body.status).toBe("fully_signed");

        const buyerBalance1 = await request(app.getHttpServer())
            .get("/points/balance")
            .set("Authorization", `Bearer ${buyer.accessToken}`)
            .expect(200);
        const ownerBalance1 = await request(app.getHttpServer())
            .get("/points/balance")
            .set("Authorization", `Bearer ${owner.accessToken}`)
            .expect(200);
        expect(buyerBalance1.body.balance).toBe(-2); // debited (within -10 floor)
        expect(ownerBalance1.body.balance).toBe(2); // credited
    });
});
