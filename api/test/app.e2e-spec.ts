import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";

describe("AppController (e2e)", () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
        await app.init();
    }, 30000);

    afterAll(async () => {
        await app.close();
    });

    it("GET /health returns status ok", () => {
        return request(app.getHttpServer())
            .get("/health")
            .expect(200)
            .expect((res) => {
                expect(res.body.status).toBe("ok");
                expect(res.body.timestamp).toBeTruthy();
            });
    });
});
