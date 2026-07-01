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
    let stranger: { accessToken: string; totpSecret: string; userId: string };

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
        stranger = await registerAndLogin(app, `pay-stranger-${ts}@test.fr`);
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

        // The contract PDF is generated on accept and downloadable by a party.
        const pdf = await request(app.getHttpServer())
            .get(`/contracts/${contractId}/pdf`)
            .set("Authorization", `Bearer ${buyer.accessToken}`)
            .expect(200);
        expect(pdf.headers["content-type"]).toContain("application/pdf");
        expect((pdf.body as Buffer).subarray(0, 5).toString()).toBe("%PDF-");

        // A non-party cannot read the PDF or the audit log.
        await request(app.getHttpServer())
            .get(`/contracts/${contractId}/pdf`)
            .set("Authorization", `Bearer ${stranger.accessToken}`)
            .expect(403);
        await request(app.getHttpServer())
            .get(`/contracts/${contractId}/audit`)
            .set("Authorization", `Bearer ${stranger.accessToken}`)
            .expect(403);

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

        // The audit log is immutable and reflects the full lifecycle so far.
        const audit = await request(app.getHttpServer())
            .get(`/contracts/${contractId}/audit`)
            .set("Authorization", `Bearer ${owner.accessToken}`)
            .expect(200);
        const actions = (audit.body as { action: string }[]).map(
            (e) => e.action,
        );
        expect(actions).toContain("generated");
        expect(actions.filter((a) => a === "signed").length).toBe(2);
        expect(actions).toContain("viewed");

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

    it("signing with a drawn image still settles and stays fully_signed", async () => {
        const PNG =
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC";

        // Fresh signatories (rather than the outer owner/buyer) so their TOTP
        // secrets have never been used: the TotpService replay guard is keyed
        // by secret+token for the lifetime of the shared app, and the outer
        // owner/buyer already consumed the offset-0/offset-30 codes in the
        // previous test.
        const ts = Date.now();
        const imgOwner = await registerAndLogin(app, `img-owner-${ts}@test.fr`);
        const imgBuyer = await registerAndLogin(app, `img-buyer-${ts}@test.fr`);

        const svc = await request(app.getHttpServer())
            .post("/services")
            .set("Authorization", `Bearer ${imgOwner.accessToken}`)
            .send({
                title: "Paid tutoring",
                description: "One hour",
                category: "tutoring",
                type: "paid",
                direction: "offer",
                duration: 60,
            })
            .expect(201);

        const booking = await request(app.getHttpServer())
            .post("/bookings")
            .set("Authorization", `Bearer ${imgBuyer.accessToken}`)
            .send({ serviceId: svc.body._id })
            .expect(201);

        const accepted = await request(app.getHttpServer())
            .post(`/bookings/${booking.body._id}/accept`)
            .set("Authorization", `Bearer ${imgOwner.accessToken}`)
            .expect(201);
        const contractId = accepted.body.contractId as string;

        await request(app.getHttpServer())
            .post(`/contracts/${contractId}/sign`)
            .set("Authorization", `Bearer ${imgBuyer.accessToken}`)
            .send({
                totpCode: currentTotp(imgBuyer.totpSecret),
                signatureImage: PNG,
            })
            .expect(201);

        const full = await request(app.getHttpServer())
            .post(`/contracts/${contractId}/sign`)
            .set("Authorization", `Bearer ${imgOwner.accessToken}`)
            .send({
                totpCode: currentTotp(imgOwner.totpSecret, 30),
                signatureImage: PNG,
            })
            .expect(201);
        expect(full.body.status).toBe("fully_signed");

        // The signed PDF is still downloadable by a party.
        const pdf = await request(app.getHttpServer())
            .get(`/contracts/${contractId}/pdf`)
            .set("Authorization", `Bearer ${imgBuyer.accessToken}`)
            .expect(200);
        expect((pdf.body as Buffer).subarray(0, 5).toString()).toBe("%PDF-");
    });
});
