import { Test, TestingModule } from "@nestjs/testing";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";

describe("AppController", () => {
    let appController: AppController;

    beforeEach(async () => {
        const app: TestingModule = await Test.createTestingModule({
            controllers: [AppController],
            providers: [AppService],
        }).compile();

        appController = app.get<AppController>(AppController);
    });

    describe("health", () => {
        it('should return { status: "OK" }', () => {
            const result = appController.health();
            expect(result.status).toBe("ok");
            expect(result.message).toBe("Server is running");
            expect(typeof result.timestamp).toBe("string");
        });
    });
});
