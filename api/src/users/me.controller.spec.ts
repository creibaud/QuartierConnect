import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { User } from "../auth/schemas/user.schema";
import { TotpService } from "../auth/totp.service";
import { DRIZZLE_TOKEN } from "../database/drizzle.module";
import { NEO4J_DRIVER } from "../social/neo4j/neo4j.provider";
import { MeController } from "./me.controller";

const mockNeo4jDriver = {
    session: jest.fn().mockReturnValue({
        run: jest.fn().mockResolvedValue({ records: [] }),
        close: jest.fn().mockResolvedValue(undefined),
    }),
};

const mockTotpService = { verify: jest.fn().mockReturnValue(true) };

function makeDb(rows: unknown[] = []): unknown {
    const chain: Record<string, jest.Mock> = {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(rows),
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
    };
    return chain;
}

const mockUserModel = {
    findOneAndUpdate: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    findOne: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
            totpSecret: "SECRET",
            email: "alice@demo.fr",
        }),
    }),
};

describe("MeController", () => {
    let controller: MeController;
    let db: any;

    beforeEach(async () => {
        db = makeDb([
            {
                id: "user-1",
                email: "alice@demo.fr",
                role: "resident",
                createdAt: new Date(),
            },
        ]);

        const module: TestingModule = await Test.createTestingModule({
            controllers: [MeController],
            providers: [
                { provide: DRIZZLE_TOKEN, useValue: db },
                { provide: getModelToken(User.name), useValue: mockUserModel },
                { provide: NEO4J_DRIVER, useValue: mockNeo4jDriver },
                { provide: TotpService, useValue: mockTotpService },
            ],
        }).compile();

        controller = module.get<MeController>(MeController);
    });

    const req = { user: { sub: "user-1" } };

    it("export returns profile and empty arrays", async () => {
        db.where = jest
            .fn()
            .mockResolvedValueOnce([
                {
                    id: "user-1",
                    email: "alice@demo.fr",
                    role: "resident",
                    createdAt: new Date(),
                },
            ])
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([]);

        const result = await controller.export(req as any);
        expect(result.profile?.email).toBe("alice@demo.fr");
        expect(result.incidents).toEqual([]);
    });

    it("deleteAccount returns success true with valid TOTP", async () => {
        db.set = jest.fn().mockReturnThis();
        db.where = jest
            .fn()
            .mockResolvedValueOnce([
                { email: "alice@demo.fr", totpSecret: "SECRET" },
            ])
            .mockResolvedValue([]);
        mockTotpService.verify.mockReturnValue(true);

        const result = await controller.deleteAccount(req as any, {
            totpCode: "123456",
        });
        expect(result.success).toBe(true);
    });
});
