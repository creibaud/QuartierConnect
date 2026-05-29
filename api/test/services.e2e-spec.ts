import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import * as speakeasy from "speakeasy";
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
): Promise<string> {
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

    return loginRes.body.accessToken as string;
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
        aliceToken = await registerAndLogin(app, `alice-svc-${ts}@test.fr`);
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
                location: { type: "Point", coordinates: [2.3522, 48.8566] },
            })
            .expect(201);

        expect(res.body.location).toEqual({
            type: "Point",
            coordinates: [2.3522, 48.8566],
        });
    });
});
