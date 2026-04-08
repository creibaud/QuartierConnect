import { Test, TestingModule } from "@nestjs/testing";
import { NEO4J_DRIVER } from "./neo4j/neo4j.provider";
import { SocialController } from "./social.controller";
import { SocialService } from "./social.service";

const mockDriver = {
    session: jest.fn().mockReturnValue({
        run: jest.fn().mockResolvedValue({ records: [] }),
        close: jest.fn().mockResolvedValue(undefined),
    }),
};

describe("SocialController", () => {
    let controller: SocialController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [SocialController],
            providers: [
                SocialService,
                { provide: NEO4J_DRIVER, useValue: mockDriver },
            ],
        }).compile();

        controller = module.get<SocialController>(SocialController);
    });

    it("returns recommendations for authenticated user", async () => {
        const req = { user: { sub: "user-123" } };
        const result = await controller.getRecommendations(req as any);
        expect(Array.isArray(result)).toBe(true);
    });

    it("returns empty array when Neo4j is down", async () => {
        mockDriver.session.mockReturnValueOnce({
            run: jest.fn().mockRejectedValue(new Error("Connection refused")),
            close: jest.fn().mockResolvedValue(undefined),
        });
        const req = { user: { sub: "user-456" } };
        const result = await controller.getRecommendations(req as any);
        expect(result).toEqual([]);
    });
});
