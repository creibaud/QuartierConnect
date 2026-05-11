import * as crypto from "crypto";
import { execSync } from "child_process";

const BASE_URL = process.env.API_URL ?? "http://localhost:5000";
const DEMO_PASSWORD = "Demo1234!";
const DEMO_TOTP_SECRET = "JBSWY3DPEHPK3PXP";
const PG_CONTAINER = process.env.PG_CONTAINER ?? "docker-postgres-1";
const PG_USER = process.env.POSTGRES_USER ?? "qc";
const PG_DB = process.env.POSTGRES_DB ?? "quartierconnect";

const ACCOUNTS = [
  { email: "alice@demo.fr", role: "resident" },
  { email: "bob@demo.fr", role: "moderator" },
  { email: "admin@demo.fr", role: "admin" },
];

async function post(path: string, body: unknown): Promise<Response> {
  return fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function extractSecret(otpauthUrl: string): string {
  const match = otpauthUrl.match(/[?&]secret=([A-Z2-7]+)/i);
  if (!match) throw new Error(`Cannot extract TOTP secret from: ${otpauthUrl}`);
  return match[1].toUpperCase();
}

function totp(secret: string): string {
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

function pgQuery(sql: string): string {
  return execSync(
    `docker exec ${PG_CONTAINER} psql -U "${PG_USER}" -d "${PG_DB}" -t -c "${sql}"`,
    { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
  ).trim();
}

function normalizeTotpSecret(email: string): void {
  try {
    pgQuery(
      `UPDATE users SET totp_secret='${DEMO_TOTP_SECRET}' WHERE email='${email}'`,
    );
  } catch {
    console.warn(
      `  ! Could not normalize TOTP secret for ${email} — is Docker running?`,
    );
  }
}

function promoteRole(email: string, role: string): void {
  if (role === "resident") return;
  try {
    pgQuery(`UPDATE users SET role='${role}' WHERE email='${email}'`);
    console.log(`  → role set to "${role}"`);
  } catch {
    console.warn(`  ! Could not set role "${role}" — is Docker running?`);
  }
}

async function seedAccount(email: string, role: string): Promise<void> {
  console.log(`Seeding ${email}…`);

  const registerRes = await post("/auth/register", {
    email,
    password: DEMO_PASSWORD,
  });

  if (registerRes.status === 409) {
    console.log(`  → already exists`);
    normalizeTotpSecret(email);
    promoteRole(email, role);
    console.log(`  → TOTP secret : ${DEMO_TOTP_SECRET}`);
    console.log(`  → code actuel : ${totp(DEMO_TOTP_SECRET)}`);
    return;
  }

  if (!registerRes.ok) {
    const err = (await registerRes.json()) as object;
    throw new Error(`Register failed for ${email}: ${JSON.stringify(err)}`);
  }

  const data = (await registerRes.json()) as { otpauthUrl: string };
  const registrationSecret = extractSecret(data.otpauthUrl);

  const loginRes = await post("/auth/login", {
    email,
    password: DEMO_PASSWORD,
    totpCode: totp(registrationSecret),
  });

  if (!loginRes.ok) {
    const err = (await loginRes.json()) as object;
    throw new Error(`Login failed for ${email}: ${JSON.stringify(err)}`);
  }

  normalizeTotpSecret(email);
  promoteRole(email, role);
  console.log(`  ✓ created (TOTP: ${DEMO_TOTP_SECRET})`);
}

async function main(): Promise<void> {
  console.log("QuartierConnect — Demo Seed");
  console.log(`API: ${BASE_URL}`);
  console.log("");

  for (const { email, role } of ACCOUNTS) {
    await seedAccount(email, role);
  }

  console.log("\nDone.");
  console.log(`Login: Demo1234! + TOTP secret ${DEMO_TOTP_SECRET}`);
  console.log(`Generate code: oathtool --totp --base32 ${DEMO_TOTP_SECRET}`);
  console.log(`Or: make totp`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
