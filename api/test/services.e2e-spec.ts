import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import * as speakeasy from "speakeasy";
import request from "supertest";
import { AppModule } from "../src/app.module";

const DEMO_PASSWORD = "Demo1234!";

function currentTotp(secret: string): string {
    return speakeasy.totp({
        secret,
        encoding: "base32",
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

describe("POST /services", () => {
    let app: INestApplication;
    let aliceToken: string;

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = module.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
        await app.init();

        const ts = Date.now();
        const alice = await registerAndLogin(app, `alice-svc-${ts}@test.fr`);
        aliceToken = alice.accessToken;
    }, 60000);

    afterAll(async () => {
        await app.close();
    });

    it("accepts and returns location as GeoJSON Point", async () => {
        const res = await request(app.getHttpServer())
            .post("/services")
            .set("Authorization", `Bearer ${aliceToken}`)
            .send({
                title: "Cours de cuisine",
                description: "Apprenez à faire des crêpes",
                category: "other",
                type: "free",
                direction: "offer",
                location: { type: "Point", coordinates: [2.3522, 48.8566] },
            })
            .expect(201);

        expect(res.body.location).toEqual({
            type: "Point",
            coordinates: [2.3522, 48.8566],
        });
    });

    it("owner accepts a booking → contract is generated (draft)", async () => {
        const bob = await registerAndLogin(
            app,
            `bob-svc-${Date.now()}@test.fr`,
        );
        // Alice (owner) creates a paid service.
        const svc = await request(app.getHttpServer())
            .post("/services")
            .set("Authorization", `Bearer ${aliceToken}`)
            .send({
                title: "Paid gardening",
                description: "One hour of weeding",
                category: "gardening",
                type: "paid",
                direction: "offer",
                duration: 60,
            })
            .expect(201);

        // Bob books it.
        const booking = await request(app.getHttpServer())
            .post("/bookings")
            .set("Authorization", `Bearer ${bob.accessToken}`)
            .send({ serviceId: svc.body._id })
            .expect(201);
        expect(booking.body.status).toBe("pending");
        expect(booking.body.pointsAmount).toBe(2); // base(60)=2 * multiplier 1

        // Alice accepts → booking accepted, contract created.
        const accepted = await request(app.getHttpServer())
            .post(`/bookings/${booking.body._id}/accept`)
            .set("Authorization", `Bearer ${aliceToken}`)
            .expect(201);
        expect(accepted.body.status).toBe("accepted");
        expect(accepted.body.contractId).toBeTruthy();
    });

    it("rejects booking your own service", async () => {
        const svc = await request(app.getHttpServer())
            .post("/services")
            .set("Authorization", `Bearer ${aliceToken}`)
            .send({
                title: "Paid transport",
                description: "Ride",
                category: "transport",
                type: "paid",
                direction: "offer",
                duration: 30,
            })
            .expect(201);
        await request(app.getHttpServer())
            .post("/bookings")
            .set("Authorization", `Bearer ${aliceToken}`)
            .send({ serviceId: svc.body._id })
            .expect(403);
    });
});
