import {
  assignAddresses,
  grantWelcomeCredits,
  seedAccounts,
} from "./seed/accounts";
import { BASE_URL, fetchList, login, request } from "./seed/client";
import { seedContent, type DemoNeighborhood } from "./seed/content";
import { seedContracts } from "./seed/contracts";
import { NEIGHBORHOOD_SHAPES } from "./seed/geo";
import { ROSTER } from "./seed/roster";
import { seedSocial } from "./seed/social";

const ADMIN_EMAIL = "admin@demo.fr";
const DEMO_NEIGHBORHOOD_NAME = "Montmartre";
const NEIGHBORHOOD_CITY = "Paris";

/** The one login the seed performs: everything else goes through register + SQL
 *  to stay clear of the TOTP replay guard. */
async function loginAdmin(): Promise<string | null> {
  const admin = ROSTER.find((account) => account.email === ADMIN_EMAIL);
  if (!admin) throw new Error(`${ADMIN_EMAIL} is missing from the roster`);
  return login(admin.email, admin.password, admin.totpSecret);
}

async function neighborhoodIdsByName(
  token: string,
): Promise<Map<string, string>> {
  const list = await fetchList<{ _id: string; name: string }>(
    token,
    "/neighborhoods",
  );
  return new Map(list.map((n) => [n.name, n._id]));
}

async function seedNeighborhoods(token: string): Promise<void> {
  const existing = await neighborhoodIdsByName(token);
  let created = 0;
  for (const shape of NEIGHBORHOOD_SHAPES) {
    if (existing.has(shape.name)) continue;
    const res = await request("/neighborhoods", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: shape.name,
        city: NEIGHBORHOOD_CITY,
        geometry: { type: "Polygon", coordinates: [shape.coordinates] },
      }),
    });
    // Carrying on would attach addresses to a neighborhood that was never
    // created and leave its residents quietly unlocated, so stop here instead.
    if (!res.ok) {
      throw new Error(`${shape.name} rejected: ${await res.text()}`);
    }
    created++;
  }
  console.log(`  ✓ ${created} Paris neighborhood(s) created`);
}

/** Centroid of a GeoJSON Polygon/MultiPolygon: mean of all its positions. */
function centroidOf(geometry: { coordinates: unknown }): [number, number] {
  const positions: number[][] = [];
  const collect = (node: unknown): void => {
    if (
      Array.isArray(node) &&
      typeof node[0] === "number" &&
      typeof node[1] === "number"
    ) {
      positions.push(node as number[]);
      return;
    }
    if (Array.isArray(node)) node.forEach(collect);
  };
  collect(geometry.coordinates);
  const lng = positions.reduce((s, p) => s + p[0], 0) / positions.length;
  const lat = positions.reduce((s, p) => s + p[1], 0) / positions.length;
  return [lng, lat];
}

/**
 * Demo neighborhood + its centroid; located demo content goes inside it.
 * Pinned by name: the list is sorted by createdAt DESC, so falling back to the
 * first entry would move all demo content as soon as a neighborhood is added.
 */
async function getDemoNeighborhood(
  token: string,
): Promise<DemoNeighborhood | null> {
  const nbhs = await fetchList<{
    _id: string;
    name: string;
    geometry?: { coordinates: unknown };
  }>(token, "/neighborhoods");
  const n = nbhs.find((x) => x.name === DEMO_NEIGHBORHOOD_NAME) ?? nbhs[0];
  if (n?.name !== DEMO_NEIGHBORHOOD_NAME) {
    console.warn(
      `  ! neighborhood "${DEMO_NEIGHBORHOOD_NAME}" not found — falling back to "${n?.name ?? "none"}"`,
    );
  }
  if (!n?.geometry) return null;
  const [lng, lat] = centroidOf(n.geometry);
  return { id: n._id, name: n.name, lng, lat };
}

async function main(): Promise<void> {
  console.log("QuartierConnect — Demo Seed");
  console.log(`API: ${BASE_URL}`);
  console.log("");

  console.log("Seeding demo accounts…");
  await seedAccounts();

  // Neighborhoods come after the accounts: creating one needs an admin token.
  const adminToken = await loginAdmin();
  if (!adminToken) {
    throw new Error(`Login failed for ${ADMIN_EMAIL} — cannot seed further`);
  }

  console.log("\nSeeding Paris neighborhoods…");
  await seedNeighborhoods(adminToken);

  console.log("\nAssigning addresses…");
  assignAddresses(await neighborhoodIdsByName(adminToken));

  console.log("\nGranting welcome credits…");
  grantWelcomeCredits();

  console.log("\nSeeding demo content…");
  const nbh = await getDemoNeighborhood(adminToken);
  if (nbh) await seedContent(adminToken, nbh);
  else console.warn("  ! no neighborhood with geometry — content skipped");

  // Bookings need the paid listings the content phase just created.
  console.log("\nSeeding bookings and contracts…");
  await seedContracts(adminToken);

  // Conversations, responses, likes and attendance all react to that content.
  if (nbh) {
    console.log("\nSeeding social activity…");
    await seedSocial(adminToken, nbh);
  }

  console.log("\nDone.");
  console.log("Login: Demo1234! — run `make totp` for the current TOTP code");
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
