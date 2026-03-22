import {
    ConflictException,
    NotFoundException,
    UnauthorizedException,
} from "@nestjs/common";
import bcrypt from "bcryptjs";
import { authenticator } from "otplib";
import type { DrizzleDB } from "src/database/drizzle/drizzle.type";
import { TotpService } from "src/modules/auth/totp.service";

jest.mock("otplib", () => ({
    authenticator: {
        generateSecret: jest.fn().mockReturnValue("TESTSECRET32BASE"),
        keyuri: jest
            .fn()
            .mockReturnValue(
                "otpauth://totp/QuartierConnect:user@example.com?secret=TESTSECRET32BASE",
            ),
        verify: jest.fn(),
    },
}));

describe("TotpService", () => {
    let service: TotpService;

    const db = {
        select: jest.fn(),
        insert: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    } as unknown as DrizzleDB;

    const userId = "6fce8b71-2d1a-4d4a-9c12-44d4624e8f81";
    const userRow = { email: "user@example.com" };
    const verifiedRecord = {
        secret: "TESTSECRET32BASE",
        backupCodes: [],
        verifiedAt: new Date(),
    };
    const unverifiedRecord = {
        secret: "TESTSECRET32BASE",
        backupCodes: [],
        verifiedAt: null,
    };

    const createSelectChain = <T>(result: T[]) => ({
        from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue(result),
            }),
        }),
    });

    const createUpdateChain = () => {
        const updateWhere = jest.fn().mockResolvedValue(undefined);
        const updateSet = jest.fn().mockReturnValue({ where: updateWhere });
        (db.update as jest.Mock).mockReturnValue({ set: updateSet });
        return { updateSet, updateWhere };
    };

    beforeEach(() => {
        jest.clearAllMocks();
        service = new TotpService(db);
    });

    describe("generateSetup", () => {
        it("throws NotFoundException when user does not exist", async () => {
            (db.select as jest.Mock).mockReturnValueOnce(createSelectChain([]));

            await expect(service.generateSetup(userId)).rejects.toBeInstanceOf(
                NotFoundException,
            );
        });

        it("throws ConflictException when TOTP is already verified", async () => {
            (db.select as jest.Mock)
                .mockReturnValueOnce(createSelectChain([userRow]))
                .mockReturnValueOnce(createSelectChain([verifiedRecord]));

            await expect(service.generateSetup(userId)).rejects.toBeInstanceOf(
                ConflictException,
            );
        });

        it("inserts new record on first setup", async () => {
            (db.select as jest.Mock)
                .mockReturnValueOnce(createSelectChain([userRow]))
                .mockReturnValueOnce(createSelectChain([]));
            (db.insert as jest.Mock).mockReturnValue({
                values: jest.fn().mockResolvedValue(undefined),
            });

            const result = await service.generateSetup(userId);

            expect(result).toHaveProperty("otpauthUrl");
            expect(result.backupCodes).toHaveLength(8);
            expect(result.backupCodes[0]).toMatch(/^[A-F0-9]{4}-[A-F0-9]{4}$/);
        });

        it("updates existing unverified record", async () => {
            (db.select as jest.Mock)
                .mockReturnValueOnce(createSelectChain([userRow]))
                .mockReturnValueOnce(createSelectChain([unverifiedRecord]));
            const { updateSet } = createUpdateChain();

            const result = await service.generateSetup(userId);

            expect(updateSet).toHaveBeenCalledTimes(1);
            expect(result.backupCodes).toHaveLength(8);
        });
    });

    describe("verifySetup", () => {
        it("throws NotFoundException when no setup was initiated", async () => {
            (db.select as jest.Mock).mockReturnValueOnce(createSelectChain([]));

            await expect(
                service.verifySetup(userId, "123456"),
            ).rejects.toBeInstanceOf(NotFoundException);
        });

        it("throws ConflictException when already verified", async () => {
            (db.select as jest.Mock).mockReturnValueOnce(
                createSelectChain([verifiedRecord]),
            );

            await expect(
                service.verifySetup(userId, "123456"),
            ).rejects.toBeInstanceOf(ConflictException);
        });

        it("throws UnauthorizedException on invalid TOTP code", async () => {
            (db.select as jest.Mock).mockReturnValueOnce(
                createSelectChain([unverifiedRecord]),
            );
            (authenticator.verify as jest.Mock).mockReturnValue(false);

            await expect(
                service.verifySetup(userId, "000000"),
            ).rejects.toBeInstanceOf(UnauthorizedException);
        });

        it("marks verifiedAt and returns success on valid code", async () => {
            (db.select as jest.Mock).mockReturnValueOnce(
                createSelectChain([unverifiedRecord]),
            );
            (authenticator.verify as jest.Mock).mockReturnValue(true);
            createUpdateChain();

            const result = await service.verifySetup(userId, "123456");

            expect(result).toEqual({ message: "TOTP successfully enabled" });
        });
    });

    describe("validateCode", () => {
        it("returns false when TOTP is not enabled", async () => {
            (db.select as jest.Mock).mockReturnValueOnce(
                createSelectChain([unverifiedRecord]),
            );

            const result = await service.validateCode(userId, "123456");

            expect(result).toBe(false);
        });

        it("returns true on valid TOTP code", async () => {
            (db.select as jest.Mock).mockReturnValueOnce(
                createSelectChain([verifiedRecord]),
            );
            (authenticator.verify as jest.Mock).mockReturnValue(true);

            const result = await service.validateCode(userId, "123456");

            expect(result).toBe(true);
        });

        it("returns true and consumes a valid backup code", async () => {
            const hashedCode = await bcrypt.hash("ABCD-1234", 10);
            const recordWithBackup = {
                ...verifiedRecord,
                backupCodes: [hashedCode],
            };
            (db.select as jest.Mock).mockReturnValueOnce(
                createSelectChain([recordWithBackup]),
            );
            (authenticator.verify as jest.Mock).mockReturnValue(false);
            createUpdateChain();

            const result = await service.validateCode(userId, "ABCD-1234");

            expect(result).toBe(true);
        });

        it("returns false when no code matches", async () => {
            (db.select as jest.Mock).mockReturnValueOnce(
                createSelectChain([{ ...verifiedRecord, backupCodes: [] }]),
            );
            (authenticator.verify as jest.Mock).mockReturnValue(false);

            const result = await service.validateCode(userId, "wrong");

            expect(result).toBe(false);
        });
    });

    describe("disable", () => {
        it("throws UnauthorizedException on invalid code", async () => {
            (db.select as jest.Mock).mockReturnValueOnce(
                createSelectChain([unverifiedRecord]),
            );

            await expect(
                service.disable(userId, "bad-code"),
            ).rejects.toBeInstanceOf(UnauthorizedException);
        });

        it("deletes totp record on valid code", async () => {
            (db.select as jest.Mock).mockReturnValueOnce(
                createSelectChain([verifiedRecord]),
            );
            (authenticator.verify as jest.Mock).mockReturnValue(true);

            const deleteWhere = jest.fn().mockResolvedValue(undefined);
            (db.delete as jest.Mock).mockReturnValue({ where: deleteWhere });

            const result = await service.disable(userId, "123456");

            expect(deleteWhere).toHaveBeenCalledTimes(1);
            expect(result).toEqual({ message: "TOTP successfully disabled" });
        });
    });

    describe("isTotpEnabled", () => {
        it("returns false when no record exists", async () => {
            (db.select as jest.Mock).mockReturnValueOnce(createSelectChain([]));

            const result = await service.isTotpEnabled(userId);

            expect(result).toBe(false);
        });

        it("returns false when record exists but not verified", async () => {
            (db.select as jest.Mock).mockReturnValueOnce(
                createSelectChain([{ verifiedAt: null }]),
            );

            const result = await service.isTotpEnabled(userId);

            expect(result).toBe(false);
        });

        it("returns true when record is verified", async () => {
            (db.select as jest.Mock).mockReturnValueOnce(
                createSelectChain([{ verifiedAt: new Date() }]),
            );

            const result = await service.isTotpEnabled(userId);

            expect(result).toBe(true);
        });
    });
});
