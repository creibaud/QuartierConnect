import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import * as speakeasy from "speakeasy";
import request from "supertest";
import { AppModule } from "../src/app.module";

const DEMO_PASSWORD = "Demo1234!";

function currentTotp(secret: string): string {
    return speakeasy.totp({ secret, encoding: "base32" });
}

async function registerAndLogin(
    app: INestApplication,
    email: string,
): Promise<string> {
    const regRes = await request(app.getHttpServer())
        .post("/auth/register")
        .send({ email, password: DEMO_PASSWORD, consent: true })
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

describe("Community votes list contract (e2e)", () => {
    let app: INestApplication;
    let token: string;
    const tag = `zzq${Date.now()}`;
    const binaryOptions = [
        { id: "yes", label: "Oui" },
        { id: "no", label: "Non" },
    ];

    async function createVote(title: string, endsAt: string): Promise<void> {
        await request(app.getHttpServer())
            .post("/community-votes")
            .set("Authorization", `Bearer ${token}`)
            .send({
                title,
                voteType: "binary",
                options: binaryOptions,
                endsAt,
                quorum: 0,
                isAnonymous: false,
            })
            .expect(201);
    }

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = module.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
        await app.init();

        token = await registerAndLogin(app, `e2e-cv-${Date.now()}@test.fr`);

        const day = 24 * 60 * 60 * 1000;
        // Two open (future deadline) + one closed (past deadline).
        await createVote(
            `${tag}-alpha`,
            new Date(Date.now() + day).toISOString(),
        );
        await createVote(
            `${tag}-bravo`,
            new Date(Date.now() + 2 * day).toISOString(),
        );
        await createVote(
            `${tag}-charlie`,
            new Date(Date.now() - day).toISOString(),
        );
    }, 60000);

    afterAll(async () => {
        await app.close();
    });

    it("searches by title across every page and reports the total", async () => {
        const paged = await request(app.getHttpServer())
            .get(`/community-votes?search=${tag}&limit=2`)
            .set("Authorization", `Bearer ${token}`)
            .expect(200);
        expect(paged.headers["x-total-count"]).toBe("3");
        expect(paged.headers["x-total-pages"]).toBe("2");
        expect(paged.body).toHaveLength(2);
    });

    it("returns only open votes when status=open", async () => {
        const res = await request(app.getHttpServer())
            .get(`/community-votes?search=${tag}&status=open&limit=100`)
            .set("Authorization", `Bearer ${token}`)
            .expect(200);
        expect(res.headers["x-total-count"]).toBe("2");
        expect(
            res.body.every(
                (v: { endsAt: string }) =>
                    new Date(v.endsAt).getTime() > Date.now(),
            ),
        ).toBe(true);
    });

    it("returns only closed votes when status=closed", async () => {
        const res = await request(app.getHttpServer())
            .get(`/community-votes?search=${tag}&status=closed&limit=100`)
            .set("Authorization", `Bearer ${token}`)
            .expect(200);
        expect(res.headers["x-total-count"]).toBe("1");
        expect(
            res.body.every(
                (v: { endsAt: string }) =>
                    new Date(v.endsAt).getTime() <= Date.now(),
            ),
        ).toBe(true);
    });

    it("sorts by endsAt ascending when asked", async () => {
        const res = await request(app.getHttpServer())
            .get(
                `/community-votes?search=${tag}&sort=endsAt&order=asc&limit=100`,
            )
            .set("Authorization", `Bearer ${token}`)
            .expect(200);
        const titles = res.body.map((v: { title: string }) => v.title);
        expect(titles).toEqual([
            `${tag}-charlie`,
            `${tag}-alpha`,
            `${tag}-bravo`,
        ]);
    });

    it("treats regex metacharacters in search as literal", async () => {
        const res = await request(app.getHttpServer())
            .get(`/community-votes?search=${tag}.*&limit=100`)
            .set("Authorization", `Bearer ${token}`)
            .expect(200);
        expect(res.headers["x-total-count"]).toBe("0");
        expect(res.body).toHaveLength(0);
    });
});
