import { INestApplication, VersioningType } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { App } from "supertest/types";
import * as packageJson from "../package.json";
import { AppModule } from "../src/app.module";

type HealthResponse = {
    status: string;
    databases: { postgres: boolean; mongodb: boolean; neo4j: boolean };
    app: string;
    timestamp: string;
};

describe("AppController (e2e)", () => {
    let app: INestApplication<App>;
    const majorVersion = packageJson.version.split(".")[0];

    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider("DRIZZLE")
            .useValue({
                execute: jest.fn().mockResolvedValue([{ result: 1 }]),
            })
            .overrideProvider("MONGODB")
            .useValue({ command: jest.fn().mockResolvedValue({}) })
            .overrideProvider("NEO4J")
            .useValue({
                verifyConnectivity: jest.fn().mockResolvedValue(undefined),
            })
            .compile();

        app = moduleFixture.createNestApplication();
        app.enableVersioning({
            type: VersioningType.URI,
            defaultVersion: majorVersion,
        });
        await app.init();
    });

    afterEach(async () => {
        await app.close();
    });

    it(`/v${majorVersion}/health (GET)`, () => {
        return request(app.getHttpServer())
            .get(`/v${majorVersion}/health`)
            .expect(200)
            .expect(({ body }: { body: HealthResponse }) => {
                expect(body.status).toBe("ok");
                expect(body.databases.postgres).toBe(true);
                expect(body.databases.mongodb).toBe(true);
                expect(body.databases.neo4j).toBe(true);
                expect(body.app).toBe("running");
                expect(typeof body.timestamp).toBe("string");
            });
    });
});
