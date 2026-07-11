import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";

describe("CORS pagination headers (e2e)", () => {
    let app: INestApplication;

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = module.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
        // Mirror the production CORS options from src/main.ts so the browser
        // can read the pagination totals off list responses.
        app.enableCors({
            origin: true,
            credentials: true,
            methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            allowedHeaders: ["Content-Type", "Authorization"],
            exposedHeaders: ["X-Total-Count", "X-Total-Pages"],
        });
        await app.init();
    }, 60000);

    afterAll(async () => {
        await app.close();
    });

    it("exposes the pagination headers to the browser", async () => {
        const res = await request(app.getHttpServer())
            .get("/neighborhoods?limit=1")
            .set("Origin", "http://localhost:3000")
            .expect(200);
        const exposed = String(
            res.headers["access-control-expose-headers"] ?? "",
        ).toLowerCase();
        expect(exposed).toContain("x-total-count");
        expect(exposed).toContain("x-total-pages");
    });
});
