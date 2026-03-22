import { randomBytes } from "node:crypto";
import {
    ConflictException,
    Inject,
    Injectable,
    Logger,
    NotFoundException,
    UnauthorizedException,
} from "@nestjs/common";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { authenticator } from "otplib";
import type { DrizzleDB } from "src/database/drizzle/drizzle.type";
import { totpSecrets, users } from "src/database/drizzle/schema";

const APP_NAME = "QuartierConnect";
const BACKUP_CODE_COUNT = 8;

@Injectable()
export class TotpService {
    private readonly logger = new Logger(TotpService.name);

    constructor(@Inject("DRIZZLE") private readonly db: DrizzleDB) {}

    async generateSetup(userId: string) {
        const [user] = await this.db
            .select({ email: users.email })
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

        if (!user) throw new NotFoundException("User not found");

        const [existing] = await this.db
            .select()
            .from(totpSecrets)
            .where(eq(totpSecrets.userId, userId))
            .limit(1);

        if (existing?.verifiedAt) {
            throw new ConflictException("TOTP is already configured");
        }

        const secret = authenticator.generateSecret();
        const otpauthUrl = authenticator.keyuri(user.email, APP_NAME, secret);

        const plainBackupCodes = this.generateBackupCodes(BACKUP_CODE_COUNT);
        const hashedBackupCodes = await Promise.all(
            plainBackupCodes.map((code) => bcrypt.hash(code, 10)),
        );

        if (existing) {
            await this.db
                .update(totpSecrets)
                .set({
                    secret,
                    backupCodes: hashedBackupCodes,
                    verifiedAt: null,
                    updatedAt: new Date(),
                })
                .where(eq(totpSecrets.userId, userId));
        } else {
            await this.db
                .insert(totpSecrets)
                .values({ userId, secret, backupCodes: hashedBackupCodes });
        }

        this.logger.log(`TOTP setup generated for user: ${userId}`);

        return { otpauthUrl, backupCodes: plainBackupCodes };
    }

    async verifySetup(userId: string, code: string) {
        const [record] = await this.db
            .select()
            .from(totpSecrets)
            .where(eq(totpSecrets.userId, userId))
            .limit(1);

        if (!record) throw new NotFoundException("TOTP setup not initiated");
        if (record.verifiedAt) {
            throw new ConflictException("TOTP is already verified");
        }

        if (!authenticator.verify({ token: code, secret: record.secret })) {
            throw new UnauthorizedException("Invalid TOTP code");
        }

        await this.db
            .update(totpSecrets)
            .set({ verifiedAt: new Date(), updatedAt: new Date() })
            .where(eq(totpSecrets.userId, userId));

        this.logger.log(`TOTP verified and enabled for user: ${userId}`);

        return { message: "TOTP successfully enabled" };
    }

    async validateCode(userId: string, code: string): Promise<boolean> {
        const [record] = await this.db
            .select()
            .from(totpSecrets)
            .where(eq(totpSecrets.userId, userId))
            .limit(1);

        if (!record?.verifiedAt) return false;

        if (authenticator.verify({ token: code, secret: record.secret })) {
            return true;
        }

        return this.consumeBackupCode(userId, code, record.backupCodes);
    }

    async disable(userId: string, code: string) {
        const isValid = await this.validateCode(userId, code);
        if (!isValid) throw new UnauthorizedException("Invalid TOTP code");

        await this.db.delete(totpSecrets).where(eq(totpSecrets.userId, userId));

        this.logger.log(`TOTP disabled for user: ${userId}`);

        return { message: "TOTP successfully disabled" };
    }

    async isTotpEnabled(userId: string): Promise<boolean> {
        const [record] = await this.db
            .select({ verifiedAt: totpSecrets.verifiedAt })
            .from(totpSecrets)
            .where(eq(totpSecrets.userId, userId))
            .limit(1);

        return !!record?.verifiedAt;
    }

    private async consumeBackupCode(
        userId: string,
        code: string,
        hashedCodes: string[],
    ): Promise<boolean> {
        for (const hashed of hashedCodes) {
            if (await bcrypt.compare(code, hashed)) {
                const remaining = hashedCodes.filter((c) => c !== hashed);
                await this.db
                    .update(totpSecrets)
                    .set({ backupCodes: remaining, updatedAt: new Date() })
                    .where(eq(totpSecrets.userId, userId));

                this.logger.warn(
                    `Backup code consumed for user: ${userId}. ${remaining.length} remaining.`,
                );
                return true;
            }
        }
        return false;
    }

    private generateBackupCodes(count: number): string[] {
        return Array.from({ length: count }, () => {
            const hex = randomBytes(4).toString("hex").toUpperCase();
            return `${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
        });
    }
}
