import { Injectable } from "@nestjs/common";
import { Store } from "@tanstack/store";
import * as QRCode from "qrcode";
import * as speakeasy from "speakeasy";

const REPLAY_TTL_MS = 90_000;

@Injectable()
export class TotpService {
    private readonly usedCodes = new Store<Record<string, number>>({});

    generateSecret(email: string): { secret: string; otpauthUrl: string } {
        const generated = speakeasy.generateSecret({
            name: `QuartierConnect:${email}`,
            issuer: "QuartierConnect",
        });

        return {
            secret: generated.base32,
            otpauthUrl: generated.otpauth_url ?? "",
        };
    }

    async generateQrCodeDataUrl(otpauthUrl: string): Promise<string> {
        return QRCode.toDataURL(otpauthUrl);
    }

    verify(secret: string, token: string): boolean {
        this.purgeExpiredCodes();
        const key = `${secret}:${token}`;
        if (this.usedCodes.state[key] !== undefined) return false;

        const valid = speakeasy.totp.verify({
            secret,
            encoding: "base32",
            token,
            window: 1,
        });

        if (valid) {
            this.usedCodes.setState((prev) => ({
                ...prev,
                [key]: Date.now() + REPLAY_TTL_MS,
            }));
        }
        return valid;
    }

    private purgeExpiredCodes(): void {
        const now = Date.now();
        const state = this.usedCodes.state;
        const expired = Object.keys(state).filter((k) => state[k] < now);
        if (expired.length === 0) return;

        this.usedCodes.setState((prev) => {
            const next = { ...prev };
            for (const k of expired) delete next[k];
            return next;
        });
    }
}
