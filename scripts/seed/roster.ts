import * as crypto from "crypto";

export interface DemoAccount {
  email: string;
  password: string;
  totpSecret: string;
  role: "resident" | "moderator" | "admin" | "banned" | "deleted";
  firstName: string;
  lastName: string;
  neighborhood: string | null;
  address: { label: string; lat: number; lng: number } | null;
  hasAvatar: boolean;
  phone: string | null;
  previousRole: string | null;
}

const DEMO_PASSWORD = "Demo1234!";

/** The three historical logins share one secret so `make totp` prints a code
 *  that works for all of them. */
const SHARED_TOTP_SECRET = "4PX635D55YS6JJV3NYIXKZPREIO6YIIV";
const SHARED_SECRET_EMAILS = ["alice@demo.fr", "bob@demo.fr", "admin@demo.fr"];

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32(bytes: Buffer): string {
  let bits = "";
  for (const byte of bytes) bits += byte.toString(2).padStart(8, "0");
  let encoded = "";
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    encoded += BASE32_ALPHABET[parseInt(bits.slice(i, i + 5), 2)];
  }
  return encoded;
}

/** The replay guard keys on "secret:token", so two accounts sharing a secret
 *  lock each other out within the same window. Derived from the email to stay
 *  reproducible across seeds. */
function totpSecretFor(email: string): string {
  if (SHARED_SECRET_EMAILS.includes(email)) return SHARED_TOTP_SECRET;
  return base32(crypto.createHash("sha1").update(email).digest());
}

const AVATAR_EMAILS = [
  "alice@demo.fr",
  "bob@demo.fr",
  "admin@demo.fr",
  "camille.bernard@demo.fr",
  "julien.moreau@demo.fr",
  "mathilde.aubert@demo.fr",
  "ines.bouvier@demo.fr",
  "karim.benhamou@demo.fr",
];

const PHONE_EMAILS = [
  "alice@demo.fr",
  "bob@demo.fr",
  "admin@demo.fr",
  "camille.bernard@demo.fr",
  "julien.moreau@demo.fr",
  "sophie.lefevre@demo.fr",
  "thomas.girard@demo.fr",
  "lea.rousseau@demo.fr",
  "manon.leroy@demo.fr",
  "hugo.marchand@demo.fr",
  "mathilde.aubert@demo.fr",
  "pierre.lacroix@demo.fr",
  "ines.bouvier@demo.fr",
  "laura.millet@demo.fr",
  "sabrina.costa@demo.fr",
  "oceane.roy@demo.fr",
  "karim.benhamou@demo.fr",
  "justine.prevost@demo.fr",
  "marc.delorme@demo.fr",
  "valerie.dubois@demo.fr",
];

function phoneFor(email: string): string | null {
  const rank = PHONE_EMAILS.indexOf(email);
  if (rank < 0) return null;
  return `+336${String(12000000 + rank * 111011)}`;
}

interface ParisDistrict {
  postcode: string;
  lng: number;
  lat: number;
}

/** Names and anchors mirror the polygons seeded by `seed-demo.ts`: same keys,
 *  each anchor on its polygon centre so the lattice below stays inside. */
const PARIS_DISTRICTS: Record<string, ParisDistrict> = {
  Montmartre: { postcode: "75018", lng: 2.3425, lat: 48.8875 },
  Marais: { postcode: "75004", lng: 2.3615, lat: 48.858 },
  Belleville: { postcode: "75020", lng: 2.384, lat: 48.8745 },
  "Quartier Latin": { postcode: "75005", lng: 2.3465, lat: 48.8505 },
  Batignolles: { postcode: "75017", lng: 2.3175, lat: 48.888 },
  Bastille: { postcode: "75011", lng: 2.3745, lat: 48.853 },
  "Buttes-Chaumont": { postcode: "75019", lng: 2.384, lat: 48.8845 },
  "Père-Lachaise": { postcode: "75020", lng: 2.393, lat: 48.861 },
  Montparnasse: { postcode: "75014", lng: 2.32, lat: 48.838 },
  "La Villette": { postcode: "75019", lng: 2.384, lat: 48.8945 },
  Bercy: { postcode: "75012", lng: 2.381, lat: 48.834 },
  Auteuil: { postcode: "75016", lng: 2.261, lat: 48.8475 },
  Charonne: { postcode: "75020", lng: 2.393, lat: 48.849 },
  "Saint-Germain-des-Prés": { postcode: "75006", lng: 2.3285, lat: 48.853 },
  "Canal Saint-Martin": { postcode: "75010", lng: 2.364, lat: 48.871 },
};

interface Suburb {
  postcode: string;
  lng: number;
  lat: number;
}

/** Real communes outside the périphérique: their coordinates must never fall
 *  into a seeded polygon, otherwise the auto-attach would empty the
 *  uncovered-addresses screen. */
const SUBURBS: Record<string, Suburb> = {
  Montreuil: { postcode: "93100", lng: 2.441, lat: 48.862 },
  Pantin: { postcode: "93500", lng: 2.402, lat: 48.894 },
  "Saint-Denis": { postcode: "93200", lng: 2.356, lat: 48.936 },
  "Ivry-sur-Seine": { postcode: "94200", lng: 2.388, lat: 48.813 },
  "Boulogne-Billancourt": { postcode: "92100", lng: 2.24, lat: 48.833 },
  Aubervilliers: { postcode: "93300", lng: 2.382, lat: 48.916 },
  Vincennes: { postcode: "94300", lng: 2.437, lat: 48.848 },
  "Levallois-Perret": { postcode: "92300", lng: 2.289, lat: 48.894 },
  Malakoff: { postcode: "92240", lng: 2.299, lat: 48.818 },
  "Saint-Ouen": { postcode: "93400", lng: 2.333, lat: 48.911 },
  "Issy-les-Moulineaux": { postcode: "92130", lng: 2.274, lat: 48.824 },
  "Charenton-le-Pont": { postcode: "94220", lng: 2.413, lat: 48.821 },
  Bagnolet: { postcode: "93170", lng: 2.418, lat: 48.868 },
  Clichy: { postcode: "92110", lng: 2.306, lat: 48.904 },
  "Le Kremlin-Bicêtre": { postcode: "94270", lng: 2.36, lat: 48.811 },
};

const LATTICE_COLUMNS = 6;

function round(value: number): number {
  return Number(value.toFixed(5));
}

interface Coordinates {
  lat: number;
  lng: number;
}

/** Spreads homes over a fixed lattice around the district anchor; the spacing
 *  keeps every point inside the seeded polygons. */
function latticePoint(district: ParisDistrict, slot: number): Coordinates {
  const column = slot % LATTICE_COLUMNS;
  const row = Math.floor(slot / LATTICE_COLUMNS);
  return {
    lng: round(district.lng - 0.0035 + column * 0.0014),
    lat: round(district.lat - 0.003 + row * 0.0015),
  };
}

interface PersonRow {
  firstName: string;
  lastName: string;
  email: string;
  street: string;
  role?: DemoAccount["role"];
}

interface LocatedRow extends PersonRow {
  neighborhood: string;
}

interface SuburbRow {
  firstName: string;
  lastName: string;
  email: string;
  city: string;
  street: string;
}

const MONTMARTRE_ROWS: PersonRow[] = [
  {
    firstName: "Alice",
    lastName: "Martin",
    email: "alice@demo.fr",
    street: "12 rue Lepic",
  },
  {
    firstName: "Bob",
    lastName: "Dupont",
    email: "bob@demo.fr",
    street: "8 rue des Abbesses",
    role: "moderator",
  },
  {
    firstName: "Camille",
    lastName: "Bernard",
    email: "camille.bernard@demo.fr",
    street: "45 rue Caulaincourt",
  },
  {
    firstName: "Julien",
    lastName: "Moreau",
    email: "julien.moreau@demo.fr",
    street: "23 rue Ordener",
  },
  {
    firstName: "Sophie",
    lastName: "Lefèvre",
    email: "sophie.lefevre@demo.fr",
    street: "3 rue Damrémont",
  },
  {
    firstName: "Thomas",
    lastName: "Girard",
    email: "thomas.girard@demo.fr",
    street: "77 rue Marcadet",
  },
  {
    firstName: "Léa",
    lastName: "Rousseau",
    email: "lea.rousseau@demo.fr",
    street: "19 rue des Martyrs",
  },
  {
    firstName: "Nicolas",
    lastName: "Fontaine",
    email: "nicolas.fontaine@demo.fr",
    street: "31 rue Custine",
  },
  {
    firstName: "Émilie",
    lastName: "Chevalier",
    email: "emilie.chevalier@demo.fr",
    street: "14 rue Ramey",
  },
  {
    firstName: "Antoine",
    lastName: "Perrin",
    email: "antoine.perrin@demo.fr",
    street: "62 rue Championnet",
  },
  {
    firstName: "Manon",
    lastName: "Leroy",
    email: "manon.leroy@demo.fr",
    street: "27 rue Joseph de Maistre",
  },
  {
    firstName: "Hugo",
    lastName: "Marchand",
    email: "hugo.marchand@demo.fr",
    street: "50 rue Lamarck",
  },
  {
    firstName: "Chloé",
    lastName: "Barbier",
    email: "chloe.barbier@demo.fr",
    street: "9 rue du Mont-Cenis",
  },
  {
    firstName: "Maxime",
    lastName: "Renaud",
    email: "maxime.renaud@demo.fr",
    street: "6 rue Muller",
  },
  {
    firstName: "Sarah",
    lastName: "Lemoine",
    email: "sarah.lemoine@demo.fr",
    street: "17 rue Berthe",
  },
  {
    firstName: "Vincent",
    lastName: "Dumas",
    email: "vincent.dumas@demo.fr",
    street: "4 rue Tholozé",
  },
  {
    firstName: "Claire",
    lastName: "Fabre",
    email: "claire.fabre@demo.fr",
    street: "21 rue Véron",
  },
  {
    firstName: "Romain",
    lastName: "Guérin",
    email: "romain.guerin@demo.fr",
    street: "35 rue Durantin",
  },
  {
    firstName: "Pauline",
    lastName: "Colin",
    email: "pauline.colin@demo.fr",
    street: "58 rue Simart",
  },
  {
    firstName: "Adrien",
    lastName: "Roussel",
    email: "adrien.roussel@demo.fr",
    street: "11 rue Poulet",
  },
  {
    firstName: "Élodie",
    lastName: "Blanchard",
    email: "elodie.blanchard@demo.fr",
    street: "88 rue Doudeauville",
  },
  {
    firstName: "Guillaume",
    lastName: "Masson",
    email: "guillaume.masson@demo.fr",
    street: "40 rue Myrha",
  },
  {
    firstName: "Amandine",
    lastName: "Poirier",
    email: "amandine.poirier@demo.fr",
    street: "16 rue Léon",
  },
  {
    firstName: "Kévin",
    lastName: "Charpentier",
    email: "kevin.charpentier@demo.fr",
    street: "7 rue Polonceau",
  },
  {
    firstName: "Nadia",
    lastName: "Benali",
    email: "nadia.benali@demo.fr",
    street: "102 rue de Clignancourt",
  },
  {
    firstName: "Olivier",
    lastName: "Deschamps",
    email: "olivier.deschamps@demo.fr",
    street: "5 rue André Antoine",
  },
];

const OTHER_DISTRICT_ROWS: LocatedRow[] = [
  {
    firstName: "Mathilde",
    lastName: "Aubert",
    email: "mathilde.aubert@demo.fr",
    neighborhood: "Marais",
    street: "18 rue des Rosiers",
    role: "moderator",
  },
  {
    firstName: "Pierre",
    lastName: "Lacroix",
    email: "pierre.lacroix@demo.fr",
    neighborhood: "Marais",
    street: "42 rue Vieille du Temple",
  },
  {
    firstName: "Inès",
    lastName: "Bouvier",
    email: "ines.bouvier@demo.fr",
    neighborhood: "Belleville",
    street: "9 rue Dénoyez",
    role: "moderator",
  },
  {
    firstName: "Yanis",
    lastName: "Traoré",
    email: "yanis.traore@demo.fr",
    neighborhood: "Belleville",
    street: "64 rue de Belleville",
  },
  {
    firstName: "Laura",
    lastName: "Millet",
    email: "laura.millet@demo.fr",
    neighborhood: "Quartier Latin",
    street: "12 rue Mouffetard",
  },
  {
    firstName: "Étienne",
    lastName: "Berger",
    email: "etienne.berger@demo.fr",
    neighborhood: "Quartier Latin",
    street: "29 rue Saint-Jacques",
  },
  {
    firstName: "Sabrina",
    lastName: "Costa",
    email: "sabrina.costa@demo.fr",
    neighborhood: "Batignolles",
    street: "7 rue des Dames",
    role: "moderator",
  },
  {
    firstName: "Damien",
    lastName: "Faure",
    email: "damien.faure@demo.fr",
    neighborhood: "Batignolles",
    street: "33 rue Legendre",
  },
  {
    firstName: "Océane",
    lastName: "Roy",
    email: "oceane.roy@demo.fr",
    neighborhood: "Bastille",
    street: "15 rue de la Roquette",
  },
  {
    firstName: "Rémi",
    lastName: "Delaunay",
    email: "remi.delaunay@demo.fr",
    neighborhood: "Bastille",
    street: "48 rue de Charonne",
  },
  {
    firstName: "Alix",
    lastName: "Marty",
    email: "alix.marty@demo.fr",
    neighborhood: "Bercy",
    street: "6 rue de Dijon",
  },
  {
    firstName: "Farid",
    lastName: "Amrani",
    email: "farid.amrani@demo.fr",
    neighborhood: "Canal Saint-Martin",
    street: "22 quai de Valmy",
  },
  {
    firstName: "Hélène",
    lastName: "Vasseur",
    email: "helene.vasseur@demo.fr",
    neighborhood: "Canal Saint-Martin",
    street: "5 rue de Lancry",
  },
  {
    firstName: "Bastien",
    lastName: "Noël",
    email: "bastien.noel@demo.fr",
    neighborhood: "Auteuil",
    street: "71 rue d'Auteuil",
  },
  {
    firstName: "Charlotte",
    lastName: "Pichon",
    email: "charlotte.pichon@demo.fr",
    neighborhood: "Buttes-Chaumont",
    street: "13 rue de Crimée",
  },
  {
    firstName: "Samuel",
    lastName: "Ferrand",
    email: "samuel.ferrand@demo.fr",
    neighborhood: "La Villette",
    street: "26 avenue Jean Jaurès",
  },
  {
    firstName: "Lucie",
    lastName: "Gaillard",
    email: "lucie.gaillard@demo.fr",
    neighborhood: "Montparnasse",
    street: "8 rue Delambre",
  },
  {
    firstName: "Théo",
    lastName: "Bourgeois",
    email: "theo.bourgeois@demo.fr",
    neighborhood: "Montparnasse",
    street: "54 rue Daguerre",
  },
  {
    firstName: "Anaïs",
    lastName: "Leclerc",
    email: "anais.leclerc@demo.fr",
    neighborhood: "Charonne",
    street: "37 rue de Bagnolet",
  },
  {
    firstName: "Fabien",
    lastName: "Michaud",
    email: "fabien.michaud@demo.fr",
    neighborhood: "Auteuil",
    street: "10 rue Poussin",
  },
  {
    firstName: "Margaux",
    lastName: "Rey",
    email: "margaux.rey@demo.fr",
    neighborhood: "Père-Lachaise",
    street: "19 rue de la Chine",
  },
  {
    firstName: "Cédric",
    lastName: "Hamon",
    email: "cedric.hamon@demo.fr",
    neighborhood: "Père-Lachaise",
    street: "3 rue des Rondeaux",
  },
  {
    firstName: "Nolwenn",
    lastName: "Le Gall",
    email: "nolwenn.legall@demo.fr",
    neighborhood: "Saint-Germain-des-Prés",
    street: "24 rue de Buci",
  },
];

const SUBURB_ROWS: SuburbRow[] = [
  {
    firstName: "Karim",
    lastName: "Benhamou",
    email: "karim.benhamou@demo.fr",
    city: "Montreuil",
    street: "14 rue de Paris",
  },
  {
    firstName: "Justine",
    lastName: "Prévost",
    email: "justine.prevost@demo.fr",
    city: "Pantin",
    street: "8 rue Hoche",
  },
  {
    firstName: "Marc",
    lastName: "Delorme",
    email: "marc.delorme@demo.fr",
    city: "Saint-Denis",
    street: "31 rue Gabriel Péri",
  },
  {
    firstName: "Aurélie",
    lastName: "Blanc",
    email: "aurelie.blanc@demo.fr",
    city: "Ivry-sur-Seine",
    street: "5 rue Raspail",
  },
  {
    firstName: "Ludovic",
    lastName: "Weber",
    email: "ludovic.weber@demo.fr",
    city: "Boulogne-Billancourt",
    street: "47 rue de Billancourt",
  },
  {
    firstName: "Fatou",
    lastName: "Diallo",
    email: "fatou.diallo@demo.fr",
    city: "Aubervilliers",
    street: "12 rue Heurtault",
  },
  {
    firstName: "Grégoire",
    lastName: "Tanguy",
    email: "gregoire.tanguy@demo.fr",
    city: "Vincennes",
    street: "9 rue de Fontenay",
  },
  {
    firstName: "Solène",
    lastName: "Maillard",
    email: "solene.maillard@demo.fr",
    city: "Levallois-Perret",
    street: "63 rue Rivay",
  },
  {
    firstName: "Xavier",
    lastName: "Brunel",
    email: "xavier.brunel@demo.fr",
    city: "Malakoff",
    street: "20 rue Béranger",
  },
  {
    firstName: "Myriam",
    lastName: "Sassi",
    email: "myriam.sassi@demo.fr",
    city: "Saint-Ouen",
    street: "4 rue du Docteur Bauer",
  },
  {
    firstName: "Benoît",
    lastName: "Carpentier",
    email: "benoit.carpentier@demo.fr",
    city: "Issy-les-Moulineaux",
    street: "28 rue du Général Leclerc",
  },
  {
    firstName: "Delphine",
    lastName: "Arnaud",
    email: "delphine.arnaud@demo.fr",
    city: "Charenton-le-Pont",
    street: "16 rue de Paris",
  },
  {
    firstName: "Sylvain",
    lastName: "Lacombe",
    email: "sylvain.lacombe@demo.fr",
    city: "Bagnolet",
    street: "7 rue Sadi Carnot",
  },
  {
    firstName: "Nathalie",
    lastName: "Ferreira",
    email: "nathalie.ferreira@demo.fr",
    city: "Clichy",
    street: "52 rue Martre",
  },
  {
    firstName: "Quentin",
    lastName: "Morvan",
    email: "quentin.morvan@demo.fr",
    city: "Le Kremlin-Bicêtre",
    street: "11 rue Élisée Reclus",
  },
];

const SANCTIONED_ROWS: LocatedRow[] = [
  {
    firstName: "Bruno",
    lastName: "Vidal",
    email: "bruno.vidal@demo.fr",
    neighborhood: "Montmartre",
    street: "66 rue Marcadet",
    role: "banned",
  },
  {
    firstName: "Sonia",
    lastName: "Klein",
    email: "sonia.klein@demo.fr",
    neighborhood: "Montmartre",
    street: "2 rue Burq",
    role: "deleted",
  },
  {
    firstName: "Franck",
    lastName: "Aubry",
    email: "franck.aubry@demo.fr",
    neighborhood: "Belleville",
    street: "38 rue Julien Lacroix",
    role: "banned",
  },
  {
    firstName: "Ingrid",
    lastName: "Bertin",
    email: "ingrid.bertin@demo.fr",
    neighborhood: "Bastille",
    street: "25 rue Keller",
    role: "banned",
  },
  {
    firstName: "Loïc",
    lastName: "Perrot",
    email: "loic.perrot@demo.fr",
    neighborhood: "Montparnasse",
    street: "17 rue Boulard",
    role: "banned",
  },
  {
    firstName: "Nina",
    lastName: "Weiss",
    email: "nina.weiss@demo.fr",
    neighborhood: "Marais",
    street: "6 rue Charlot",
    role: "deleted",
  },
];

const ADMIN_ROWS = [
  {
    firstName: "Admin",
    lastName: "QuartierConnect",
    email: "admin@demo.fr",
  },
  {
    firstName: "Valérie",
    lastName: "Dubois",
    email: "valerie.dubois@demo.fr",
  },
];

function baseAccount(
  row: { firstName: string; lastName: string; email: string },
  role: DemoAccount["role"],
): DemoAccount {
  return {
    email: row.email,
    password: DEMO_PASSWORD,
    totpSecret: totpSecretFor(row.email),
    role,
    firstName: row.firstName,
    lastName: row.lastName,
    neighborhood: null,
    address: null,
    hasAvatar: AVATAR_EMAILS.includes(row.email),
    phone: phoneFor(row.email),
    previousRole: role === "banned" ? "resident" : null,
  };
}

function districtAccount(
  row: PersonRow,
  neighborhood: string,
  slot: number,
): DemoAccount {
  const district = PARIS_DISTRICTS[neighborhood];
  const point = latticePoint(district, slot);
  return {
    ...baseAccount(row, row.role ?? "resident"),
    neighborhood,
    address: {
      label: `${row.street}, ${district.postcode} Paris`,
      lat: point.lat,
      lng: point.lng,
    },
  };
}

/** Located outside every polygon, so the address stays unattached and shows up
 *  in GET /neighborhoods/uncovered-addresses. */
function suburbAccount(row: SuburbRow): DemoAccount {
  const suburb = SUBURBS[row.city];
  return {
    ...baseAccount(row, "resident"),
    address: {
      label: `${row.street}, ${suburb.postcode} ${row.city}`,
      lat: suburb.lat,
      lng: suburb.lng,
    },
  };
}

function buildRoster(): DemoAccount[] {
  const usedSlots = new Map<string, number>();
  const takeSlot = (neighborhood: string): number => {
    const slot = usedSlots.get(neighborhood) ?? 0;
    usedSlots.set(neighborhood, slot + 1);
    return slot;
  };
  return [
    ...MONTMARTRE_ROWS.map((row) =>
      districtAccount(row, "Montmartre", takeSlot("Montmartre")),
    ),
    ...OTHER_DISTRICT_ROWS.map((row) =>
      districtAccount(row, row.neighborhood, takeSlot(row.neighborhood)),
    ),
    ...SUBURB_ROWS.map(suburbAccount),
    ...SANCTIONED_ROWS.map((row) =>
      districtAccount(row, row.neighborhood, takeSlot(row.neighborhood)),
    ),
    ...ADMIN_ROWS.map((row) => baseAccount(row, "admin")),
  ];
}

export const ROSTER: DemoAccount[] = buildRoster();
