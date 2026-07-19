import { NEIGHBORHOOD_NAMES, NEIGHBORHOOD_SHAPES, containsPoint } from "./geo";
import { DemoAccount, ROSTER } from "./roster";

const DEMO_LOGIN_EMAILS = ["alice@demo.fr", "bob@demo.fr", "admin@demo.fr"];

function countByRole(role: DemoAccount["role"]): number {
  return ROSTER.filter((account) => account.role === role).length;
}

function ringOf(name: string): number[][] {
  const shape = NEIGHBORHOOD_SHAPES.find((entry) => entry.name === name);
  if (!shape) throw new Error(`No polygon named ${name}`);
  return shape.coordinates;
}

type LocatedAccount = DemoAccount & {
  address: NonNullable<DemoAccount["address"]>;
};

function located(): LocatedAccount[] {
  return ROSTER.filter(
    (account): account is LocatedAccount => account.address !== null,
  );
}

function uncovered(): LocatedAccount[] {
  return located().filter((account) => account.neighborhood === null);
}

describe("ROSTER", () => {
  it("holds 72 demo accounts", () => {
    expect(ROSTER).toHaveLength(72);
  });

  it("has unique emails", () => {
    const emails = ROSTER.map((account) => account.email);
    expect(new Set(emails).size).toBe(emails.length);
  });

  // The replay guard keys on "secret:token": a shared secret would let only one
  // of them log in per 30 s window.
  it("gives every account its own TOTP secret", () => {
    const secrets = ROSTER.map((account) => account.totpSecret);
    expect(new Set(secrets).size).toBe(secrets.length);
  });

  it("pins the three demo logins to a documented base32 secret", () => {
    const pinned = ROSTER.filter((account) =>
      DEMO_LOGIN_EMAILS.includes(account.email),
    );
    expect(pinned).toHaveLength(3);
    for (const account of pinned) {
      expect(account.totpSecret).toMatch(/^[A-Z2-7]{32}$/);
    }
  });

  it("keeps alice on the secret already handed out", () => {
    const alice = ROSTER.find((account) => account.email === "alice@demo.fr");
    expect(alice?.totpSecret).toBe("4PX635D55YS6JJV3NYIXKZPREIO6YIIV");
  });

  it("splits roles 60/4/2/4/2", () => {
    expect(countByRole("resident")).toBe(60);
    expect(countByRole("moderator")).toBe(4);
    expect(countByRole("admin")).toBe(2);
    expect(countByRole("banned")).toBe(4);
    expect(countByRole("deleted")).toBe(2);
  });

  it("exposes 15 uncovered addresses", () => {
    expect(uncovered()).toHaveLength(15);
  });

  it("only uses neighborhoods that seed-demo actually creates", () => {
    const used = ROSTER.map((account) => account.neighborhood).filter(
      (name): name is string => name !== null,
    );
    expect(used.filter((name) => !NEIGHBORHOOD_NAMES.includes(name))).toEqual(
      [],
    );
  });

  it("puts every resident inside the polygon of their own neighborhood", () => {
    const misplaced = ROSTER.filter(
      (account) =>
        account.neighborhood !== null &&
        account.address !== null &&
        !containsPoint(ringOf(account.neighborhood), account.address),
    );
    expect(misplaced.map((account) => account.email)).toEqual([]);
  });

  // The screen filters on neighborhood_id NULL, and the API attaches any address
  // that lands in a polygon — one stray point would empty it.
  it("keeps every uncovered address outside all 15 polygons", () => {
    const attached = uncovered().filter((account) =>
      NEIGHBORHOOD_SHAPES.some((shape) =>
        containsPoint(shape.coordinates, account.address),
      ),
    );
    expect(attached.map((account) => account.email)).toEqual([]);
  });

  it("gives no two accounts the same doorstep", () => {
    const points = located().map(
      (account) => `${account.address.lng},${account.address.lat}`,
    );
    expect(new Set(points).size).toBe(points.length);
  });

  it("never leaks a myskolae address", () => {
    expect(JSON.stringify(ROSTER)).not.toContain("myskolae");
  });
});
