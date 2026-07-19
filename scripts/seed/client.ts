import * as crypto from "crypto";
import { execFileSync } from "child_process";
import { readFileSync } from "fs";
import { join } from "path";

export const BASE_URL = process.env.API_URL ?? "http://localhost:5000";

const PG_CONTAINER = process.env.PG_CONTAINER ?? "docker-postgres-1";
const PG_USER = process.env.POSTGRES_USER ?? "qc";
const PG_DB = process.env.POSTGRES_DB ?? "quartierconnect";

const MONGO_CONTAINER = process.env.MONGO_CONTAINER ?? "docker-mongo-1";
const MONGO_DB = process.env.MONGO_DB ?? "quartierconnect";
const MONGO_USER = process.env.MONGO_ROOT_USER ?? "root";

/** The API drops idle keep-alive sockets and the seed pauses on long SQL
 *  phases, so the first call after one loses the race. One retry absorbs it. */
export async function request(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  try {
    return await fetch(`${BASE_URL}${path}`, init);
  } catch {
    return fetch(`${BASE_URL}${path}`, init);
  }
}

export async function post(path: string, body: unknown): Promise<Response> {
  return request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function pgQuery(
  sql: string,
  vars: Record<string, string> = {},
): string {
  // No shell involved; values are bound via psql -v so psql handles quoting.
  const varArgs = Object.entries(vars).flatMap(([name, value]) => [
    "-v",
    `${name}=${value}`,
  ]);
  return execFileSync(
    "docker",
    [
      "exec",
      "-i",
      PG_CONTAINER,
      "psql",
      "-U",
      PG_USER,
      "-d",
      PG_DB,
      "-t",
      ...varArgs,
    ],
    { input: sql, encoding: "utf8" },
  ).trim();
}

/** The seed inherits the shell environment, which carries no secret. */
function mongoPassword(): string {
  const fromEnv = process.env.MONGO_ROOT_PASSWORD;
  if (fromEnv) return fromEnv;
  const envFile = readFileSync(join(__dirname, "..", "..", ".env"), "utf8");
  return /^MONGO_ROOT_PASSWORD=(.*)$/m.exec(envFile)?.[1].trim() ?? "";
}

/**
 * Runs a mongosh snippet and returns what it printed. Messaging has no HTTP
 * route for a text message — the gateway is the only application path — so the
 * seed writes those documents itself.
 */
export function mongoEval(script: string): string {
  return execFileSync(
    "docker",
    [
      "exec",
      "-i",
      MONGO_CONTAINER,
      "mongosh",
      MONGO_DB,
      "--quiet",
      "-u",
      MONGO_USER,
      "-p",
      mongoPassword(),
      "--authenticationDatabase",
      "admin",
      "--eval",
      script,
    ],
    { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
  ).trim();
}

/** `expression` is evaluated in mongosh and its value parsed back as JSON. */
export function mongoJson<T>(expression: string): T {
  return JSON.parse(mongoEval(`JSON.stringify(${expression})`)) as T;
}

const MAX_PAGE_SIZE = 100;

/**
 * A full list endpoint, in one request. The API clamps `limit` to 100, and
 * paging past it is unreliable: the default createdAt sort has no tiebreak, so
 * skip/limit both repeats and drops rows. The seed stays under the ceiling and
 * says so loudly when it no longer does.
 */
export async function fetchList<T>(token: string, path: string): Promise<T[]> {
  const res = await request(`${path}?limit=${MAX_PAGE_SIZE}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const items = (await res.json()) as T[];
  if (!Array.isArray(items)) return [];
  const total = Number(res.headers.get("x-total-count") ?? items.length);
  if (total > MAX_PAGE_SIZE) {
    console.warn(
      `  ! ${path}: ${total} entries for a ${MAX_PAGE_SIZE} cap — idempotency not guaranteed`,
    );
  }
  return items;
}

/** Titles already present on a list endpoint, to keep seeding idempotent. */
export async function fetchExistingTitles(
  token: string,
  path: string,
): Promise<Set<string>> {
  const items = await fetchList<{ title?: string }>(token, path);
  return new Set(
    items
      .map((item) => item.title)
      .filter((title): title is string => Boolean(title)),
  );
}

export function totp(secret: string): string {
  const base32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of secret.toUpperCase()) {
    const v = base32.indexOf(c);
    if (v >= 0) bits += v.toString(2).padStart(5, "0");
  }
  const key = Buffer.alloc(Math.floor(bits.length / 8));
  for (let i = 0; i < key.length; i++) {
    key[i] = parseInt(bits.slice(i * 8, (i + 1) * 8), 2);
  }
  const counter = Math.floor(Date.now() / 1000 / 30);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac("sha1", key).update(buf).digest();
  const off = hmac[hmac.length - 1] & 0x0f;
  const code =
    (((hmac[off] & 0x7f) << 24) |
      ((hmac[off + 1] & 0xff) << 16) |
      ((hmac[off + 2] & 0xff) << 8) |
      (hmac[off + 3] & 0xff)) %
    1_000_000;
  return code.toString().padStart(6, "0");
}

const TOTP_WINDOW_MS = 30_000;
const LOGIN_ATTEMPTS = 3;

/** The next code is only minted on the next window boundary. */
export function waitForNextTotpWindow(): Promise<void> {
  const elapsed = Date.now() % TOTP_WINDOW_MS;
  return new Promise((resolve) =>
    setTimeout(resolve, TOTP_WINDOW_MS - elapsed + 1_000),
  );
}

/**
 * Every account carries its own secret, so a rejected code is almost always a
 * window that turned over between minting and posting. The next window mints a
 * fresh code, which is why retrying — rather than resending — is the way out.
 */
export async function login(
  email: string,
  password: string,
  totpSecret: string,
): Promise<string | null> {
  for (let attempt = 1; ; attempt++) {
    const res = await post("/auth/login", {
      email,
      password,
      totpCode: totp(totpSecret),
    });
    if (res.ok) {
      const data = (await res.json()) as { accessToken: string };
      return data.accessToken;
    }
    if (attempt === LOGIN_ATTEMPTS) return null;
    await waitForNextTotpWindow();
  }
}
