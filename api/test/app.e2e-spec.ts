import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "./../src/app.module";

describe("AppController (e2e)", () => {
    let app: INestApplication<App>;

    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterEach(async () => {
        await app.close();
    });

    describe("GET /health", () => {
        it("should return health status with JSON", () => {
            return request(app.getHttpServer())
                .get("/health")
                .expect(200)
                .expect((res) => {
                    expect(res.body).toHaveProperty("status", "ok");
                    expect(res.body).toHaveProperty("message");
                    expect(res.body).toHaveProperty("timestamp");
                });
        });
    });
});
