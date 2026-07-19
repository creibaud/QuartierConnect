import * as fs from "fs";
import * as path from "path";
import { DemoAccount, ROSTER } from "./roster";

/** seed-demo.ts runs its whole seed on import, so read the polygon names from
 *  the source instead. */
function seededNeighborhoods(): string[] {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "seed-demo.ts"),
    "utf8",
  );
  const block = source.match(/const PARIS_NEIGHBORHOODS[\s\S]*?\n\];/);
  if (!block) throw new Error("PARIS_NEIGHBORHOODS not found in seed-demo.ts");
  return [...block[0].matchAll(/name: "([^"]+)"/g)].map((match) => match[1]);
}

const SHARED_SECRET_EMAILS = ["alice@demo.fr", "bob@demo.fr", "admin@demo.fr"];

function countByRole(role: DemoAccount["role"]): number {
  return ROSTER.filter((account) => account.role === role).length;
}

describe("ROSTER", () => {
  it("holds 72 demo accounts", () => {
    expect(ROSTER).toHaveLength(72);
  });

  it("has unique emails", () => {
    const emails = ROSTER.map((account) => account.email);
    expect(new Set(emails).size).toBe(emails.length);
  });

  it("gives every account outside the three demo logins its own TOTP secret", () => {
    const secrets = ROSTER.filter(
      (account) => !SHARED_SECRET_EMAILS.includes(account.email),
    ).map((account) => account.totpSecret);
    expect(new Set(secrets).size).toBe(secrets.length);
  });

  it("keeps the shared secret on the three demo logins", () => {
    const shared = ROSTER.filter((account) =>
      SHARED_SECRET_EMAILS.includes(account.email),
    );
    expect(shared).toHaveLength(3);
    expect(new Set(shared.map((account) => account.totpSecret)).size).toBe(1);
  });

  it("splits roles 60/4/2/4/2", () => {
    expect(countByRole("resident")).toBe(60);
    expect(countByRole("moderator")).toBe(4);
    expect(countByRole("admin")).toBe(2);
    expect(countByRole("banned")).toBe(4);
    expect(countByRole("deleted")).toBe(2);
  });

  it("exposes 15 uncovered addresses", () => {
    const uncovered = ROSTER.filter(
      (account) => account.neighborhood === null && account.address !== null,
    );
    expect(uncovered).toHaveLength(15);
  });

  it("only uses neighborhoods that seed-demo actually creates", () => {
    const seeded = seededNeighborhoods();
    const used = [
      ...new Set(
        ROSTER.map((account) => account.neighborhood).filter(
          (name): name is string => name !== null,
        ),
      ),
    ];
    expect(used.filter((name) => !seeded.includes(name))).toEqual([]);
  });

  it("never leaks a myskolae address", () => {
    expect(JSON.stringify(ROSTER)).not.toContain("myskolae");
  });
});
