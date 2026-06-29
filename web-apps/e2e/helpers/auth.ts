import { execSync } from "child_process";
import * as crypto from "crypto";

const API = "http://localhost:5000";
export const DEMO_PASSWORD = "Demo1234!";

const PG_CONTAINER = process.env.PG_CONTAINER ?? "docker-postgres-1";
const PG_USER = process.env.POSTGRES_USER ?? "qc";
const PG_DB = process.env.POSTGRES_DB ?? "quartierconnect";

/** Give a registered user an address + neighborhood directly in Postgres so they
 *  pass the client address gate (mirrors scripts/seed-demo.ts). No-op without docker. */
export function assignAddress(email: string): void {
    try {
        execSync(
            `docker exec ${PG_CONTAINER} psql -U "${PG_USER}" -d "${PG_DB}" -c "UPDATE users SET address='1 rue de la Demo, 75001 Paris', address_lat=48.8566, address_lng=2.3522, neighborhood_id='e2e-neighborhood' WHERE email='${email}'"`,
            { stdio: "pipe" },
        );
    } catch {
        // docker/psql unavailable (e.g. local run) — gate-dependent tests will fail visibly
    }
}

/** RFC 6238 TOTP — pure Node crypto, no external dependency.
 *  @param timeOffsetSeconds — shift the clock by N seconds (e.g. -30 = previous window)
 */
export function currentTotp(secret: string, timeOffsetSeconds = 0): string {
    const base32Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let bits = "";
    for (const char of secret.toUpperCase()) {
        const val = base32Chars.indexOf(char);
        if (val >= 0) bits += val.toString(2).padStart(5, "0");
    }
    const keyBytes = Buffer.alloc(Math.floor(bits.length / 8));
    for (let i = 0; i < keyBytes.length; i++) {
        keyBytes[i] = parseInt(bits.slice(i * 8, (i + 1) * 8), 2);
    }
    const counter = Math.floor((Date.now() / 1000 + timeOffsetSeconds) / 30);
    const counterBuf = Buffer.alloc(8);
    counterBuf.writeBigUInt64BE(BigInt(counter));
    const hmac = crypto
        .createHmac("sha1", keyBytes)
        .update(counterBuf)
        .digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const code =
        (((hmac[offset] & 0x7f) << 24) |
            ((hmac[offset + 1] & 0xff) << 16) |
            ((hmac[offset + 2] & 0xff) << 8) |
            (hmac[offset + 3] & 0xff)) %
        1_000_000;
    return code.toString().padStart(6, "0");
}

export function extractSecret(otpauthUrl: string): string {
    const match = otpauthUrl.match(/[?&]secret=([A-Z2-7]+)/i);
    if (!match) throw new Error(`Cannot extract secret from: ${otpauthUrl}`);
    return match[1].toUpperCase();
}

export function uniqueEmail(): string {
    return `e2e_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@test.fr`;
}

/** Returns true when the error is a network/connection error (API not running). */
export function isConnectionError(err: unknown): boolean {
    return (
        err instanceof TypeError &&
        (err as TypeError).message.includes("fetch failed")
    );
}

/** Register via API and return the TOTP secret extracted from the QR URL. */
export async function apiRegister(email: string): Promise<string> {
    const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: DEMO_PASSWORD }),
    });
    if (!res.ok) {
        const err = (await res.json()) as object;
        throw new Error(`Register failed for ${email}: ${JSON.stringify(err)}`);
    }
    const data = (await res.json()) as { otpauthUrl: string };
    return extractSecret(data.otpauthUrl);
}

/** Login via API and return tokens.
 *  @param timeOffsetSeconds — shift the TOTP clock (e.g. -30 for previous window)
 */
export async function apiLogin(
    email: string,
    secret: string,
    timeOffsetSeconds = 0,
): Promise<{ accessToken: string; refreshToken: string }> {
    const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email,
            password: DEMO_PASSWORD,
            totpCode: currentTotp(secret, timeOffsetSeconds),
        }),
    });
    if (!res.ok) {
        const err = (await res.json()) as object;
        throw new Error(`Login failed for ${email}: ${JSON.stringify(err)}`);
    }
    return res.json() as Promise<{ accessToken: string; refreshToken: string }>;
}

/** Inject JWT tokens into localStorage so the app considers the user authenticated.
 *  Keys must match packages/shared/src/lib/auth.ts: qc_access_token / qc_refresh_token
 */
export async function injectTokens(
    page: import("@playwright/test").Page,
    baseUrl: string,
    accessToken: string,
    refreshToken: string,
) {
    // Navigate to the login page (no auth redirect) so localStorage is writable at the right origin
    await page.goto(`${baseUrl}/login`);
    await page.evaluate(
        ({ at, rt }: { at: string; rt: string }) => {
            localStorage.setItem("qc_access_token", at);
            localStorage.setItem("qc_refresh_token", rt);
        },
        { at: accessToken, rt: refreshToken },
    );
}
