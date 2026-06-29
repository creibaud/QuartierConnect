import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import * as argon2 from "argon2";
import { User } from "../auth/schemas/user.schema";
import { TotpService } from "../auth/totp.service";
import { DRIZZLE_TOKEN } from "../database/drizzle.module";
import { NEO4J_DRIVER } from "../social/neo4j/neo4j.provider";
import { MeController } from "./me.controller";

jest.mock("argon2");

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

    it("getProfile returns the current user's profile", async () => {
        db.where = jest.fn().mockResolvedValue([
            {
                id: "user-1",
                email: "alice@demo.fr",
                role: "resident",
                firstName: "Alice",
                lastName: "Martin",
                avatarUrl: null,
            },
        ]);
        const result = await controller.getProfile(req as any);
        expect(result?.firstName).toBe("Alice");
    });

    it("updateProfile updates the name and returns the profile", async () => {
        db.where = jest.fn().mockReturnThis();
        db.returning = jest.fn().mockResolvedValue([
            {
                id: "user-1",
                email: "alice@demo.fr",
                role: "resident",
                firstName: "Alicia",
                lastName: "Martin",
                avatarUrl: null,
            },
        ]);
        const result = await controller.updateProfile(req as any, {
            firstName: "Alicia",
        });
        expect(result?.firstName).toBe("Alicia");
    });

    it("changePassword succeeds with the correct current password", async () => {
        db.where = jest
            .fn()
            .mockResolvedValueOnce([{ passwordHash: "old-hash" }])
            .mockResolvedValue(undefined);
        (argon2.verify as jest.Mock).mockResolvedValue(true);
        (argon2.hash as jest.Mock).mockResolvedValue("new-hash");
        const result = await controller.changePassword(req as any, {
            currentPassword: "Demo1234!",
            newPassword: "NewDemo1234!",
        });
        expect(result.success).toBe(true);
    });

    it("changePassword rejects an incorrect current password", async () => {
        db.where = jest.fn().mockResolvedValue([{ passwordHash: "old-hash" }]);
        (argon2.verify as jest.Mock).mockResolvedValue(false);
        await expect(
            controller.changePassword(req as any, {
                currentPassword: "wrong",
                newPassword: "NewDemo1234!",
            }),
        ).rejects.toThrow();
    });
});
