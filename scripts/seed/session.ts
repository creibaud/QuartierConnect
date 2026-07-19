import { login, request } from "./client";
import { ROSTER } from "./roster";

/** Access tokens live 15 minutes; a long seed outlives them. */
const TOKEN_TTL_MS = 8 * 60 * 1000;

const tokens = new Map<string, { value: string; issuedAt: number }>();

/** Adopts a token the caller already holds, sparing a shared TOTP code. */
export function primeToken(email: string, value: string): void {
  tokens.set(email, { value, issuedAt: Date.now() });
}

export async function tokenFor(email: string): Promise<string> {
  const cached = tokens.get(email);
  if (cached && Date.now() - cached.issuedAt < TOKEN_TTL_MS)
    return cached.value;

  const account = ROSTER.find((entry) => entry.email === email);
  if (!account) throw new Error(`${email} is missing from the roster`);
  const value = await login(
    account.email,
    account.password,
    account.totpSecret,
  );
  if (!value) throw new Error(`Login failed for ${email}`);
  primeToken(email, value);
  return value;
}

export async function sendAs(
  email: string,
  path: string,
  init: { method: "GET" | "POST" | "PATCH"; body?: unknown },
): Promise<Response> {
  const token = await tokenFor(email);
  return request(path, {
    method: init.method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    ...(init.method === "GET" ? {} : { body: JSON.stringify(init.body ?? {}) }),
  });
}

export async function postAs(
  email: string,
  path: string,
  body: unknown,
): Promise<Response> {
  return sendAs(email, path, { method: "POST", body });
}

/**
 * Callers read this to decide what already exists, so a failed request must not
 * come back as an empty list: that reads as "nothing is there" and the seed
 * re-creates rows the API would happily accept a second time.
 */
export async function getAs<T>(email: string, path: string): Promise<T[]> {
  const res = await sendAs(email, path, { method: "GET" });
  if (!res.ok) {
    throw new Error(
      `GET ${path} as ${email} failed (${res.status}): ${await res.text()}`,
    );
  }
  const items = (await res.json()) as T[];
  if (!Array.isArray(items)) {
    throw new Error(`GET ${path} as ${email} did not return a list`);
  }
  return items;
}

export async function warnIfFailed(
  label: string,
  res: Response,
): Promise<boolean> {
  if (res.ok) return true;
  console.warn(`  ! ${label} failed (${res.status}): ${await res.text()}`);
  return false;
}
