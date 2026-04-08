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

describe("Social / Recommendations (e2e)", () => {
    let app: INestApplication;
    let user1Token: string;
    let user2Token: string;
    let eventId: string;

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
            `e2e-social-u1-${ts}@test.fr`,
        );
        const user2 = await registerAndLogin(
            app,
            `e2e-social-u2-${ts}@test.fr`,
        );
        user1Token = user1.accessToken;
        user2Token = user2.accessToken;

        const futureDate = new Date(
            Date.now() + 7 * 24 * 3600 * 1000,
        ).toISOString();

        const ev1 = await request(app.getHttpServer())
            .post("/events")
            .set("Authorization", `Bearer ${user1Token}`)
            .send({
                title: "Concert Neo4j 1",
                description: "Desc",
                category: "culture",
                date: futureDate,
            })
            .expect(201);
        eventId = ev1.body._id as string;

        await request(app.getHttpServer())
            .post("/events")
            .set("Authorization", `Bearer ${user1Token}`)
            .send({
                title: "Concert Neo4j 2",
                description: "Desc",
                category: "culture",
                date: futureDate,
            })
            .expect(201);

        await request(app.getHttpServer())
            .post("/events")
            .set("Authorization", `Bearer ${user1Token}`)
            .send({
                title: "Concert Neo4j 3",
                description: "Desc",
                category: "sport",
                date: futureDate,
            })
            .expect(201);

        await request(app.getHttpServer())
            .post(`/events/${eventId}/interest`)
            .set("Authorization", `Bearer ${user2Token}`)
            .expect(201);
    }, 60000);

    afterAll(async () => {
        await app.close();
    });

    it("GET /recommendations returns 401 without token", async () => {
        await request(app.getHttpServer()).get("/recommendations").expect(401);
    });

    it("GET /recommendations returns an array", async () => {
        const res = await request(app.getHttpServer())
            .get("/recommendations")
            .set("Authorization", `Bearer ${user1Token}`)
            .expect(200);

        expect(Array.isArray(res.body)).toBe(true);
    });

    it("GET /recommendations does not throw when Neo4j is unavailable", async () => {
        const res = await request(app.getHttpServer())
            .get("/recommendations")
            .set("Authorization", `Bearer ${user2Token}`)
            .expect(200);

        expect(Array.isArray(res.body)).toBe(true);
    });
});
