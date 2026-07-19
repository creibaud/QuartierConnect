import {
  assignAddresses,
  grantWelcomeCredits,
  seedAccounts,
} from "./seed/accounts";
import { BASE_URL, fetchList, login, request } from "./seed/client";
import { seedContent, type DemoNeighborhood } from "./seed/content";
import { seedContracts } from "./seed/contracts";
import { ROSTER } from "./seed/roster";
import { seedSocial } from "./seed/social";

const ADMIN_EMAIL = "admin@demo.fr";
const DEMO_NEIGHBORHOOD_NAME = "Montmartre";

const PARIS_NEIGHBORHOODS: Array<{
  name: string;
  city: string;
  coordinates: number[][];
}> = [
  {
    name: "Montmartre",
    city: "Paris",
    coordinates: [
      [2.338, 48.883],
      [2.347, 48.883],
      [2.347, 48.892],
      [2.338, 48.892],
      [2.338, 48.883],
    ],
  },
  {
    name: "Marais",
    city: "Paris",
    coordinates: [
      [2.355, 48.854],
      [2.368, 48.854],
      [2.368, 48.862],
      [2.355, 48.862],
      [2.355, 48.854],
    ],
  },
  {
    name: "Belleville",
    city: "Paris",
    coordinates: [
      [2.376, 48.87],
      [2.392, 48.87],
      [2.392, 48.879],
      [2.376, 48.879],
      [2.376, 48.87],
    ],
  },
  {
    name: "Quartier Latin",
    city: "Paris",
    coordinates: [
      [2.338, 48.846],
      [2.355, 48.846],
      [2.355, 48.855],
      [2.338, 48.855],
      [2.338, 48.846],
    ],
  },
  {
    name: "Batignolles",
    city: "Paris",
    coordinates: [
      [2.31, 48.883],
      [2.325, 48.883],
      [2.325, 48.893],
      [2.31, 48.893],
      [2.31, 48.883],
    ],
  },
  {
    name: "Bastille",
    city: "Paris",
    coordinates: [
      [2.369, 48.848],
      [2.38, 48.848],
      [2.38, 48.858],
      [2.369, 48.858],
      [2.369, 48.848],
    ],
  },
  {
    name: "Buttes-Chaumont",
    city: "Paris",
    coordinates: [
      [2.376, 48.88],
      [2.392, 48.88],
      [2.392, 48.889],
      [2.376, 48.889],
      [2.376, 48.88],
    ],
  },
  {
    name: "Père-Lachaise",
    city: "Paris",
    coordinates: [
      [2.386, 48.856],
      [2.4, 48.856],
      [2.4, 48.866],
      [2.386, 48.866],
      [2.386, 48.856],
    ],
  },
  {
    name: "Montparnasse",
    city: "Paris",
    coordinates: [
      [2.31, 48.833],
      [2.33, 48.833],
      [2.33, 48.843],
      [2.31, 48.843],
      [2.31, 48.833],
    ],
  },
  {
    name: "La Villette",
    city: "Paris",
    coordinates: [
      [2.376, 48.89],
      [2.392, 48.89],
      [2.392, 48.899],
      [2.376, 48.899],
      [2.376, 48.89],
    ],
  },
  {
    name: "Bercy",
    city: "Paris",
    coordinates: [
      [2.372, 48.828],
      [2.39, 48.828],
      [2.39, 48.84],
      [2.372, 48.84],
      [2.372, 48.828],
    ],
  },
  {
    name: "Auteuil",
    city: "Paris",
    coordinates: [
      [2.252, 48.842],
      [2.27, 48.842],
      [2.27, 48.853],
      [2.252, 48.853],
      [2.252, 48.842],
    ],
  },
  {
    name: "Charonne",
    city: "Paris",
    coordinates: [
      [2.386, 48.843],
      [2.4, 48.843],
      [2.4, 48.855],
      [2.386, 48.855],
      [2.386, 48.843],
    ],
  },
  {
    name: "Saint-Germain-des-Prés",
    city: "Paris",
    coordinates: [
      [2.32, 48.848],
      [2.337, 48.848],
      [2.337, 48.858],
      [2.32, 48.858],
      [2.32, 48.848],
    ],
  },
  {
    name: "Canal Saint-Martin",
    city: "Paris",
    coordinates: [
      [2.356, 48.866],
      [2.372, 48.866],
      [2.372, 48.876],
      [2.356, 48.876],
      [2.356, 48.866],
    ],
  },
];

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
  for (const nbh of PARIS_NEIGHBORHOODS) {
    if (existing.has(nbh.name)) continue;
    const res = await request("/neighborhoods", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: nbh.name,
        city: nbh.city,
        geometry: { type: "Polygon", coordinates: [nbh.coordinates] },
      }),
    });
    if (res.ok) created++;
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
