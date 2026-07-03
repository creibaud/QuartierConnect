import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import * as argon2 from "argon2";
import { User } from "../auth/schemas/user.schema";
import { TokenService } from "../auth/token.service";
import { TotpService } from "../auth/totp.service";
import { DRIZZLE_TOKEN } from "../database/drizzle.module";
import { NEO4J_DRIVER } from "../social/neo4j/neo4j.provider";
import { GdprExportService } from "./gdpr-export.service";
import { MeController } from "./me.controller";

jest.mock("argon2");

const mockNeo4jSession = {
    run: jest.fn().mockResolvedValue({ records: [] }),
    close: jest.fn().mockResolvedValue(undefined),
};

const mockNeo4jDriver = {
    session: jest.fn().mockReturnValue(mockNeo4jSession),
};

const mockTotpService = { verify: jest.fn().mockReturnValue(true) };

const mockTokenService = {
    revokeAccessToken: jest.fn().mockResolvedValue(undefined),
};

const mockGdprExportService = {
    exportUserData: jest.fn().mockResolvedValue({ profile: null }),
};

function makeDb(rows: unknown[] = []): any {
    const chain: Record<string, jest.Mock> = {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(rows),
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
    };
    (chain as any).transaction = jest
        .fn()
        .mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) =>
            cb(chain),
        );
    return chain;
}

const mockUserModel = {
    findOneAndUpdate: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
};

describe("MeController", () => {
    let controller: MeController;
    let db: any;

    beforeEach(async () => {
        jest.clearAllMocks();
        mockTotpService.verify.mockReturnValue(true);
        mockNeo4jDriver.session.mockReturnValue(mockNeo4jSession);
        mockNeo4jSession.run.mockResolvedValue({ records: [] });
        mockUserModel.findOneAndUpdate.mockReturnValue({
            exec: jest.fn().mockResolvedValue(null),
        });

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
                { provide: TokenService, useValue: mockTokenService },
                {
                    provide: GdprExportService,
                    useValue: mockGdprExportService,
                },
            ],
        }).compile();

        controller = module.get<MeController>(MeController);
    });

    const req = { user: { sub: "user-1", jti: "jti-1", exp: 9999999999 } };

    it("export delegates to GdprExportService with the current user id", async () => {
        const exportPayload = { profile: { id: "user-1" } };
        mockGdprExportService.exportUserData.mockResolvedValue(exportPayload);

        const result = await controller.export(req as any);

        expect(mockGdprExportService.exportUserData).toHaveBeenCalledWith(
            "user-1",
        );
        expect(result).toBe(exportPayload);
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
        expect(db.set).toHaveBeenCalledWith(
            expect.objectContaining({ role: "deleted", phone: null }),
        );
    });

    it("getProfile returns the current user's profile with phone", async () => {
        db.where = jest.fn().mockResolvedValue([
            {
                id: "user-1",
                email: "alice@demo.fr",
                role: "resident",
                firstName: "Alice",
                lastName: "Martin",
                avatarUrl: null,
                phone: "+33612345678",
            },
        ]);
        const result = await controller.getProfile(req as any);
        expect(result?.firstName).toBe("Alice");
        expect(result?.phone).toBe("+33612345678");
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

    describe("changePassword", () => {
        const validBody = {
            currentPassword: "Demo1234!",
            newPassword: "NewDemo1234!",
            totpCode: "123456",
        };

        it("succeeds with correct current password and valid TOTP", async () => {
            db.where = jest
                .fn()
                .mockResolvedValueOnce([
                    { passwordHash: "old-hash", totpSecret: "SECRET" },
                ])
                .mockResolvedValue(undefined);
            (argon2.verify as jest.Mock).mockResolvedValue(true);
            (argon2.hash as jest.Mock).mockResolvedValue("new-hash");

            const result = await controller.changePassword(
                req as any,
                validBody,
            );
            expect(result.success).toBe(true);
            expect(mockTotpService.verify).toHaveBeenCalledWith(
                "SECRET",
                "123456",
            );
        });

        it("rejects an incorrect current password", async () => {
            db.where = jest
                .fn()
                .mockResolvedValue([
                    { passwordHash: "old-hash", totpSecret: "SECRET" },
                ]);
            (argon2.verify as jest.Mock).mockResolvedValue(false);

            await expect(
                controller.changePassword(req as any, {
                    ...validBody,
                    currentPassword: "wrong",
                }),
            ).rejects.toThrow(UnauthorizedException);
        });

        it("rejects an invalid TOTP code with 401", async () => {
            db.where = jest
                .fn()
                .mockResolvedValue([
                    { passwordHash: "old-hash", totpSecret: "SECRET" },
                ]);
            (argon2.verify as jest.Mock).mockResolvedValue(true);
            mockTotpService.verify.mockReturnValue(false);

            await expect(
                controller.changePassword(req as any, validBody),
            ).rejects.toThrow(UnauthorizedException);
        });

        it("rejects a replayed TOTP code (guard returns false)", async () => {
            db.where = jest
                .fn()
                .mockResolvedValue([
                    { passwordHash: "old-hash", totpSecret: "SECRET" },
                ]);
            (argon2.verify as jest.Mock).mockResolvedValue(true);
            (argon2.hash as jest.Mock).mockResolvedValue("new-hash");
            mockTotpService.verify
                .mockReturnValueOnce(true)
                .mockReturnValueOnce(false);

            await controller.changePassword(req as any, validBody);
            await expect(
                controller.changePassword(req as any, validBody),
            ).rejects.toThrow(UnauthorizedException);
        });
    });

    describe("changeEmail", () => {
        const validBody = {
            newEmail: "alice.new@demo.fr",
            password: "Demo1234!",
            totpCode: "123456",
        };
        const currentUserRow = {
            email: "alice@demo.fr",
            passwordHash: "old-hash",
            totpSecret: "SECRET",
        };

        it("updates PG, propagates to Mongo and Neo4j, revokes tokens", async () => {
            db.where = jest
                .fn()
                .mockResolvedValueOnce([currentUserRow])
                .mockResolvedValueOnce([])
                .mockResolvedValue(undefined);
            (argon2.verify as jest.Mock).mockResolvedValue(true);

            const result = await controller.changeEmail(req as any, validBody);

            expect(result).toEqual({ requiresReauth: true });
            expect(db.transaction).toHaveBeenCalled();
            expect(db.set).toHaveBeenCalledWith(
                expect.objectContaining({
                    email: "alice.new@demo.fr",
                    refreshTokenHash: null,
                }),
            );
            expect(mockTokenService.revokeAccessToken).toHaveBeenCalledWith(
                "jti-1",
                expect.any(Date),
            );
            expect(mockUserModel.findOneAndUpdate).toHaveBeenCalledWith(
                { email: "alice@demo.fr" },
                { $set: { email: "alice.new@demo.fr" } },
            );
            expect(mockNeo4jSession.run).toHaveBeenCalledWith(
                expect.stringContaining("SET u.email"),
                { userId: "user-1", newEmail: "alice.new@demo.fr" },
            );
        });

        it("rejects an incorrect password with 401", async () => {
            db.where = jest.fn().mockResolvedValue([currentUserRow]);
            (argon2.verify as jest.Mock).mockResolvedValue(false);

            await expect(
                controller.changeEmail(req as any, validBody),
            ).rejects.toThrow(UnauthorizedException);
        });

        it("rejects an invalid TOTP code with 401", async () => {
            db.where = jest.fn().mockResolvedValue([currentUserRow]);
            (argon2.verify as jest.Mock).mockResolvedValue(true);
            mockTotpService.verify.mockReturnValue(false);

            await expect(
                controller.changeEmail(req as any, validBody),
            ).rejects.toThrow(UnauthorizedException);
        });

        it("rejects an email already used by another account with 409", async () => {
            db.where = jest
                .fn()
                .mockResolvedValueOnce([currentUserRow])
                .mockResolvedValueOnce([{ id: "user-2" }]);
            (argon2.verify as jest.Mock).mockResolvedValue(true);

            await expect(
                controller.changeEmail(req as any, validBody),
            ).rejects.toThrow(ConflictException);
        });

        it("maps a PG unique violation during the update to 409", async () => {
            db.where = jest
                .fn()
                .mockResolvedValueOnce([currentUserRow])
                .mockResolvedValueOnce([])
                .mockRejectedValue({ code: "23505" });
            (argon2.verify as jest.Mock).mockResolvedValue(true);

            await expect(
                controller.changeEmail(req as any, validBody),
            ).rejects.toThrow(ConflictException);
        });
    });

    describe("changePhone", () => {
        it("stores the normalized phone with a valid TOTP", async () => {
            db.where = jest
                .fn()
                .mockResolvedValueOnce([{ totpSecret: "SECRET" }])
                .mockResolvedValue(undefined);

            const result = await controller.changePhone(req as any, {
                phone: "+33 6 12 34 56 78",
                totpCode: "123456",
            });

            expect(result).toEqual({ success: true, phone: "+33612345678" });
            expect(db.set).toHaveBeenCalledWith(
                expect.objectContaining({ phone: "+33612345678" }),
            );
        });

        it("erases the phone when null is provided", async () => {
            db.where = jest
                .fn()
                .mockResolvedValueOnce([{ totpSecret: "SECRET" }])
                .mockResolvedValue(undefined);

            const result = await controller.changePhone(req as any, {
                phone: null,
                totpCode: "123456",
            });

            expect(result).toEqual({ success: true, phone: null });
        });

        it("rejects an invalid TOTP code with 401", async () => {
            db.where = jest.fn().mockResolvedValue([{ totpSecret: "SECRET" }]);
            mockTotpService.verify.mockReturnValue(false);

            await expect(
                controller.changePhone(req as any, {
                    phone: "+33612345678",
                    totpCode: "000000",
                }),
            ).rejects.toThrow(UnauthorizedException);
        });
    });
});
