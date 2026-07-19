import { DemoAccount, ROSTER } from "./roster";
import { pgQuery, post } from "./client";

/** Registration hands out a random TOTP secret; the roster secret replaces it in
 *  SQL so demo codes stay reproducible. Roles and sanctions have no writable API
 *  either (UpdateRoleDto rejects "deleted"), hence the direct UPDATE. */
const APPLY_IDENTITY_SQL = `
  UPDATE users SET
    totp_secret = :'secret',
    role = :'role',
    previous_role = NULLIF(:'previousRole', ''),
    phone = NULLIF(:'phone', ''),
    refresh_token_hash =
      CASE WHEN :'role' = 'deleted' THEN NULL ELSE refresh_token_hash END
  WHERE email = :'email'`;

const ASSIGN_ADDRESS_SQL = `
  UPDATE users SET
    address = :'address',
    address_lat = :'lat'::float8,
    address_lng = :'lng'::float8,
    neighborhood_id = NULLIF(:'neighborhood', '')
  WHERE email = :'email'`;

const WELCOME_CREDIT_POINTS = 20;
const WELCOME_CREDIT_NOTE = "Crédit de bienvenue";

const WELCOME_CREDIT_SQL = `
  WITH credited AS (
    INSERT INTO points_transactions
      (sender_id, recipient_id, amount, note, type, status, created_at, completed_at)
    SELECT admin.id, u.id, :'points'::int, :'note',
           'bonus', 'completed', u.created_at, u.created_at
    FROM users u, users admin
    WHERE u.email = :'email' AND admin.email = 'admin@demo.fr'
      AND NOT EXISTS (
        SELECT 1 FROM points_transactions t
        WHERE t.recipient_id = u.id AND t.note = :'note'
      )
    RETURNING recipient_id, amount
  )
  INSERT INTO points_balances (user_id, balance)
  SELECT recipient_id, amount FROM credited
  ON CONFLICT (user_id) DO UPDATE
  SET balance = points_balances.balance + excluded.balance, updated_at = now()`;

/** Sanctioned accounts never went through onboarding, so they get no credit. */
function isSanctioned(account: DemoAccount): boolean {
  return account.role === "banned" || account.role === "deleted";
}

/** Returns true when the account already existed. Registration is the only call
 *  here: it consumes no TOTP, unlike a login, whose replay guard keys on
 *  "secret:token" and would reject the accounts sharing a secret. */
async function register(account: DemoAccount): Promise<boolean> {
  const res = await post("/auth/register", {
    email: account.email,
    password: account.password,
    firstName: account.firstName,
    lastName: account.lastName,
    consent: true,
  });
  if (res.status === 409) return true;
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(
      `Register failed for ${account.email} (${res.status}): ${detail}`,
    );
  }
  return false;
}

function applyIdentity(account: DemoAccount): void {
  pgQuery(APPLY_IDENTITY_SQL, {
    secret: account.totpSecret,
    role: account.role,
    previousRole: account.previousRole ?? "",
    phone: account.phone ?? "",
    email: account.email,
  });
}

export async function seedAccounts(): Promise<void> {
  let created = 0;
  for (const account of ROSTER) {
    if (!(await register(account))) created++;
    applyIdentity(account);
  }
  console.log(
    `  ✓ ${ROSTER.length} demo account(s) in place (${created} created)`,
  );
}

/**
 * Writes the roster homes. Accounts whose neighborhood is null keep a NULL
 * neighborhood_id with a non-null latitude, which is exactly what
 * GET /neighborhoods/uncovered-addresses looks for.
 */
export function assignAddresses(neighborhoodIds: Map<string, string>): void {
  let assigned = 0;
  for (const account of ROSTER) {
    if (!account.address) continue;
    const neighborhoodId = account.neighborhood
      ? neighborhoodIds.get(account.neighborhood)
      : "";
    if (neighborhoodId === undefined) {
      console.warn(
        `  ! neighborhood "${account.neighborhood}" unknown — ${account.email} left unassigned`,
      );
      continue;
    }
    pgQuery(ASSIGN_ADDRESS_SQL, {
      address: account.address.label,
      lat: String(account.address.lat),
      lng: String(account.address.lng),
      neighborhood: neighborhoodId,
      email: account.email,
    });
    assigned++;
  }
  console.log(`  ✓ ${assigned} address(es) assigned`);
}

/** One-time welcome credit so demo balances start positive; idempotent per note. */
export function grantWelcomeCredits(): void {
  let credited = 0;
  for (const account of ROSTER) {
    if (isSanctioned(account)) continue;
    pgQuery(WELCOME_CREDIT_SQL, {
      points: String(WELCOME_CREDIT_POINTS),
      note: WELCOME_CREDIT_NOTE,
      email: account.email,
    });
    credited++;
  }
  console.log(
    `  ✓ welcome credit (+${WELCOME_CREDIT_POINTS} pts) on ${credited} account(s)`,
  );
}
