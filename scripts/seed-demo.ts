import * as crypto from "crypto";
import { execSync } from "child_process";

const BASE_URL = process.env.API_URL ?? "http://localhost:5000";
const DEMO_PASSWORD = "Demo1234!";
const DEMO_TOTP_SECRET = "JBSWY3DPEHPK3PXP";
const PG_CONTAINER = process.env.PG_CONTAINER ?? "docker-postgres-1";
const PG_USER = process.env.POSTGRES_USER ?? "qc";
const PG_DB = process.env.POSTGRES_DB ?? "quartierconnect";

const ACCOUNTS = [
  {
    email: "alice@demo.fr",
    role: "resident",
    firstName: "Alice",
    lastName: "Martin",
  },
  {
    email: "bob@demo.fr",
    role: "moderator",
    firstName: "Bob",
    lastName: "Dupont",
  },
  {
    email: "admin@demo.fr",
    role: "admin",
    firstName: "Admin",
    lastName: "QuartierConnect",
  },
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

async function seedAccount(
  email: string,
  role: string,
  firstName: string,
  lastName: string,
): Promise<void> {
  console.log(`Seeding ${email}…`);

  const registerRes = await post("/auth/register", {
    email,
    password: DEMO_PASSWORD,
    firstName,
    lastName,
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
];

async function loginAdmin(): Promise<string | null> {
  const res = await post("/auth/login", {
    email: "admin@demo.fr",
    password: DEMO_PASSWORD,
    totpCode: totp(DEMO_TOTP_SECRET),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { accessToken: string };
  return data.accessToken;
}

async function existingNeighborhoodNames(token: string): Promise<Set<string>> {
  const res = await fetch(`${BASE_URL}/neighborhoods`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return new Set();
  const list = (await res.json()) as Array<{ name: string }>;
  return new Set(list.map((n) => n.name));
}

async function seedNeighborhoods(token: string): Promise<void> {
  const existing = await existingNeighborhoodNames(token);
  let created = 0;
  for (const nbh of PARIS_NEIGHBORHOODS) {
    if (existing.has(nbh.name)) continue;
    const res = await fetch(`${BASE_URL}/neighborhoods`, {
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
  console.log(`  ✓ ${created} quartier(s) Paris créé(s)`);
}

interface DemoNeighborhood {
  id: string;
  lng: number;
  lat: number;
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

/** The demo neighborhood (first one) + its centroid, used to place all
 *  located demo content inside a single coherent quartier. */
async function getDemoNeighborhood(
  token: string,
): Promise<DemoNeighborhood | null> {
  const res = await fetch(`${BASE_URL}/neighborhoods`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const nbhs = (res.ok ? await res.json() : []) as Array<{
    _id: string;
    geometry?: { coordinates: unknown };
  }>;
  const n = nbhs[0];
  if (!n?.geometry) return null;
  const [lng, lat] = centroidOf(n.geometry);
  return { id: n._id, lng, lat };
}

// Deterministic offsets (~150-350 m around the centroid) so markers spread out.
const SPREAD: Array<[number, number]> = [
  [0.003, 0.002],
  [-0.004, 0.001],
  [0.002, -0.003],
  [-0.002, -0.002],
  [0.004, 0.003],
  [-0.003, 0.004],
  [0.001, 0.003],
  [-0.001, -0.004],
];

async function seedContent(
  token: string,
  nbh: DemoNeighborhood,
): Promise<void> {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
  const neighborhoodId = nbh.id;
  const at = (i: number): { type: "Point"; coordinates: [number, number] } => ({
    type: "Point",
    coordinates: [
      nbh.lng + SPREAD[i % SPREAD.length][0],
      nbh.lat + SPREAD[i % SPREAD.length][1],
    ],
  });

  const evRes = await fetch(`${BASE_URL}/events`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const existing = (evRes.ok ? await evRes.json() : []) as unknown[];
  if (existing.length > 0) return;

  const inDays = (d: number) =>
    new Date(Date.now() + d * 86400000).toISOString();

  const events = [
    {
      title: "Vide-grenier du quartier",
      description:
        "Grand vide-grenier annuel, de 9h à 18h sur la place du marché.",
      category: "community",
      date: inDays(6),
      neighborhoodId,
      location: at(0),
    },
    {
      title: "Concert en plein air",
      description: "Soirée musicale avec les artistes du quartier.",
      category: "culture",
      date: inDays(12),
      neighborhoodId,
      location: at(1),
    },
    {
      title: "Tournoi de pétanque",
      description: "Inscriptions sur place, ouvert à tous les habitants.",
      category: "sport",
      date: inDays(20),
      neighborhoodId,
      location: at(2),
    },
  ];
  for (const e of events) {
    await fetch(`${BASE_URL}/events`, {
      method: "POST",
      headers,
      body: JSON.stringify(e),
    });
  }

  const services = [
    {
      title: "Aide au jardinage le week-end",
      description:
        "Je propose mon aide pour désherber et tailler les haies le samedi matin.",
      category: "gardening",
      type: "exchange",
      direction: "offer",
      neighborhoodId,
      location: at(0),
    },
    {
      title: "Cours de soutien scolaire",
      description:
        "Étudiant disponible pour aider collégiens et lycéens en maths.",
      category: "other",
      type: "paid",
      direction: "offer",
      neighborhoodId,
      location: at(1),
    },
    {
      title: "Garde d'animaux",
      description: "Je garde vos animaux de compagnie pendant vos absences.",
      category: "childcare",
      type: "free",
      direction: "offer",
      neighborhoodId,
      location: at(2),
    },
    {
      title: "Recherche covoiturage pour le marché",
      description:
        "Je cherche un trajet partagé vers le marché le dimanche matin.",
      category: "transport",
      type: "free",
      direction: "request",
      neighborhoodId,
      location: at(3),
    },
    {
      title: "Cherche aide pour petit déménagement",
      description:
        "Besoin d'un coup de main pour déplacer quelques meubles ce mois-ci.",
      category: "handyman",
      type: "paid",
      direction: "request",
      neighborhoodId,
      location: at(4),
    },
    {
      title: "Massage thérapeutique",
      description: "Massage relaxant pour détente et bien-être du quartier.",
      category: "other",
      type: "paid",
      duration: 60,
      direction: "offer",
      neighborhoodId,
      location: at(5),
    },
  ];
  for (const s of services) {
    await fetch(`${BASE_URL}/services`, {
      method: "POST",
      headers,
      body: JSON.stringify(s),
    });
  }

  const incidents = [
    {
      title: "Lampadaire cassé rue de la Paix",
      description: "Le lampadaire est tombé et bloque en partie le trottoir.",
      category: "neighborhood",
      neighborhoodId,
      lat: nbh.lat + SPREAD[0][1],
      lng: nbh.lng + SPREAD[0][0],
    },
    {
      title: "Dépôt sauvage de déchets",
      description:
        "Encombrants abandonnés depuis plusieurs jours au coin de la rue.",
      category: "neighborhood",
      neighborhoodId,
      lat: nbh.lat + SPREAD[1][1],
      lng: nbh.lng + SPREAD[1][0],
    },
    {
      title: "Nid-de-poule dangereux",
      description: "Trou important sur la chaussée, risque pour les cyclistes.",
      category: "neighborhood",
      neighborhoodId,
      lat: nbh.lat + SPREAD[2][1],
      lng: nbh.lng + SPREAD[2][0],
    },
    {
      title: "Tag sur le mur de l'école",
      description: "Graffiti à nettoyer sur la façade de l'école primaire.",
      category: "neighborhood",
      neighborhoodId,
      lat: nbh.lat + SPREAD[3][1],
      lng: nbh.lng + SPREAD[3][0],
    },
    {
      title: "Bug : la page Votes ne charge pas",
      description:
        "Signalement technique de l'application (interne modération).",
      category: "bug",
      neighborhoodId,
    },
    {
      title: "Signalement : contenu inapproprié",
      description: "Un message à modérer dans la messagerie.",
      category: "reporting",
      neighborhoodId,
    },
  ];
  for (const i of incidents) {
    await fetch(`${BASE_URL}/incidents`, {
      method: "POST",
      headers,
      body: JSON.stringify(i),
    });
  }

  await fetch(`${BASE_URL}/community-votes`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      title: "Faut-il installer des bancs supplémentaires dans le parc ?",
      description: "Vote consultatif pour les résidents du quartier.",
      voteType: "binary",
      options: [
        { id: "oui", label: "Oui" },
        { id: "non", label: "Non" },
      ],
      endsAt: inDays(14),
    }),
  });
}

/** Assign an address + neighborhood to the non-admin demo residents so they
 *  pass the address gate (admins are gate-exempt). Without this, alice/bob are
 *  redirected to /onboarding/address and the client E2E suite can't reach the app. */
async function assignNeighborhoodToResidents(
  nbh: DemoNeighborhood,
): Promise<void> {
  // Home sits at the neighborhood centroid so the "home" marker is always
  // inside the polygon and the maps centre coherently.
  for (const { email, role } of ACCOUNTS) {
    if (role === "admin") continue;
    try {
      pgQuery(
        `UPDATE users SET address='Centre du quartier, Paris', address_lat=${nbh.lat}, address_lng=${nbh.lng}, neighborhood_id='${nbh.id}' WHERE email='${email}'`,
      );
      process.stdout.write(`  → ${email} assigned to neighborhood ${nbh.id}\n`);
    } catch {
      process.stdout.write(`  ! could not assign neighborhood for ${email}\n`);
    }
  }
}

async function main(): Promise<void> {
  console.log("QuartierConnect — Demo Seed");
  console.log(`API: ${BASE_URL}`);
  console.log("");

  for (const { email, role, firstName, lastName } of ACCOUNTS) {
    await seedAccount(email, role, firstName, lastName);
  }

  console.log("\nSeeding Paris neighborhoods…");
  const adminToken = await loginAdmin();
  if (adminToken) {
    await seedNeighborhoods(adminToken);
    const nbh = await getDemoNeighborhood(adminToken);
    if (nbh) {
      await assignNeighborhoodToResidents(nbh);
      await seedContent(adminToken, nbh);
    } else {
      process.stdout.write(
        "  ! no neighborhood with geometry — content skipped\n",
      );
    }
  } else {
    console.warn("  ! admin login failed — skipping neighborhood seed");
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
