import * as crypto from "crypto";
import {
  NEIGHBORHOOD_ADDRESSES,
  SUBURB_ADDRESSES,
  type DemoAddress,
} from "./geo";

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

/** The replay guard keys on "secret:token", so accounts sharing a secret lock
 *  each other out for a whole 30 s window. These three are the logins a demo
 *  switches between, so each one is pinned to its own literal: they are printed
 *  by `make totp` and written down in the docs. Alice keeps the historical
 *  value, hers is the QR code already handed out. */
const DEMO_TOTP_SECRETS: Record<string, string> = {
  "alice@demo.fr": "4PX635D55YS6JJV3NYIXKZPREIO6YIIV",
  "bob@demo.fr": "K7QM4TZBX2VNHR5CJWYD6LPS3AF4EGU2",
  "admin@demo.fr": "P4WDGNQ7RJ25XKTCVBM3ZLHY6SFA4EDN",
};

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

/** Everyone else is derived from the email: nobody logs in as them by hand, and
 *  a hash keeps the secret reproducible across seeds. */
function totpSecretFor(email: string): string {
  return (
    DEMO_TOTP_SECRETS[email] ??
    base32(crypto.createHash("sha1").update(email).digest())
  );
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

interface PersonRow {
  firstName: string;
  lastName: string;
  email: string;
  role?: DemoAccount["role"];
}

interface LocatedRow extends PersonRow {
  neighborhood: string;
}

const MONTMARTRE_ROWS: PersonRow[] = [
  {
    firstName: "Alice",
    lastName: "Martin",
    email: "alice@demo.fr",
  },
  {
    firstName: "Bob",
    lastName: "Dupont",
    email: "bob@demo.fr",
    role: "moderator",
  },
  {
    firstName: "Camille",
    lastName: "Bernard",
    email: "camille.bernard@demo.fr",
  },
  {
    firstName: "Julien",
    lastName: "Moreau",
    email: "julien.moreau@demo.fr",
  },
  {
    firstName: "Sophie",
    lastName: "Lefèvre",
    email: "sophie.lefevre@demo.fr",
  },
  {
    firstName: "Thomas",
    lastName: "Girard",
    email: "thomas.girard@demo.fr",
  },
  {
    firstName: "Léa",
    lastName: "Rousseau",
    email: "lea.rousseau@demo.fr",
  },
  {
    firstName: "Nicolas",
    lastName: "Fontaine",
    email: "nicolas.fontaine@demo.fr",
  },
  {
    firstName: "Émilie",
    lastName: "Chevalier",
    email: "emilie.chevalier@demo.fr",
  },
  {
    firstName: "Antoine",
    lastName: "Perrin",
    email: "antoine.perrin@demo.fr",
  },
  {
    firstName: "Manon",
    lastName: "Leroy",
    email: "manon.leroy@demo.fr",
  },
  {
    firstName: "Hugo",
    lastName: "Marchand",
    email: "hugo.marchand@demo.fr",
  },
  {
    firstName: "Chloé",
    lastName: "Barbier",
    email: "chloe.barbier@demo.fr",
  },
  {
    firstName: "Maxime",
    lastName: "Renaud",
    email: "maxime.renaud@demo.fr",
  },
  {
    firstName: "Sarah",
    lastName: "Lemoine",
    email: "sarah.lemoine@demo.fr",
  },
  {
    firstName: "Vincent",
    lastName: "Dumas",
    email: "vincent.dumas@demo.fr",
  },
  {
    firstName: "Claire",
    lastName: "Fabre",
    email: "claire.fabre@demo.fr",
  },
  {
    firstName: "Romain",
    lastName: "Guérin",
    email: "romain.guerin@demo.fr",
  },
  {
    firstName: "Pauline",
    lastName: "Colin",
    email: "pauline.colin@demo.fr",
  },
  {
    firstName: "Adrien",
    lastName: "Roussel",
    email: "adrien.roussel@demo.fr",
  },
  {
    firstName: "Élodie",
    lastName: "Blanchard",
    email: "elodie.blanchard@demo.fr",
  },
  {
    firstName: "Guillaume",
    lastName: "Masson",
    email: "guillaume.masson@demo.fr",
  },
  {
    firstName: "Amandine",
    lastName: "Poirier",
    email: "amandine.poirier@demo.fr",
  },
  {
    firstName: "Kévin",
    lastName: "Charpentier",
    email: "kevin.charpentier@demo.fr",
  },
  {
    firstName: "Nadia",
    lastName: "Benali",
    email: "nadia.benali@demo.fr",
  },
  {
    firstName: "Olivier",
    lastName: "Deschamps",
    email: "olivier.deschamps@demo.fr",
  },
];

const OTHER_DISTRICT_ROWS: LocatedRow[] = [
  {
    firstName: "Mathilde",
    lastName: "Aubert",
    email: "mathilde.aubert@demo.fr",
    neighborhood: "Marais",
    role: "moderator",
  },
  {
    firstName: "Pierre",
    lastName: "Lacroix",
    email: "pierre.lacroix@demo.fr",
    neighborhood: "Marais",
  },
  {
    firstName: "Inès",
    lastName: "Bouvier",
    email: "ines.bouvier@demo.fr",
    neighborhood: "Belleville",
    role: "moderator",
  },
  {
    firstName: "Yanis",
    lastName: "Traoré",
    email: "yanis.traore@demo.fr",
    neighborhood: "Belleville",
  },
  {
    firstName: "Laura",
    lastName: "Millet",
    email: "laura.millet@demo.fr",
    neighborhood: "Quartier Latin",
  },
  {
    firstName: "Étienne",
    lastName: "Berger",
    email: "etienne.berger@demo.fr",
    neighborhood: "Quartier Latin",
  },
  {
    firstName: "Sabrina",
    lastName: "Costa",
    email: "sabrina.costa@demo.fr",
    neighborhood: "Batignolles",
    role: "moderator",
  },
  {
    firstName: "Damien",
    lastName: "Faure",
    email: "damien.faure@demo.fr",
    neighborhood: "Batignolles",
  },
  {
    firstName: "Océane",
    lastName: "Roy",
    email: "oceane.roy@demo.fr",
    neighborhood: "Bastille",
  },
  {
    firstName: "Rémi",
    lastName: "Delaunay",
    email: "remi.delaunay@demo.fr",
    neighborhood: "Bastille",
  },
  {
    firstName: "Alix",
    lastName: "Marty",
    email: "alix.marty@demo.fr",
    neighborhood: "Butte-aux-Cailles",
  },
  {
    firstName: "Farid",
    lastName: "Amrani",
    email: "farid.amrani@demo.fr",
    neighborhood: "Canal Saint-Martin",
  },
  {
    firstName: "Hélène",
    lastName: "Vasseur",
    email: "helene.vasseur@demo.fr",
    neighborhood: "Canal Saint-Martin",
  },
  {
    firstName: "Bastien",
    lastName: "Noël",
    email: "bastien.noel@demo.fr",
    neighborhood: "Passy",
  },
  {
    firstName: "Charlotte",
    lastName: "Pichon",
    email: "charlotte.pichon@demo.fr",
    neighborhood: "Oberkampf",
  },
  {
    firstName: "Samuel",
    lastName: "Ferrand",
    email: "samuel.ferrand@demo.fr",
    neighborhood: "La Villette",
  },
  {
    firstName: "Lucie",
    lastName: "Gaillard",
    email: "lucie.gaillard@demo.fr",
    neighborhood: "Montparnasse",
  },
  {
    firstName: "Théo",
    lastName: "Bourgeois",
    email: "theo.bourgeois@demo.fr",
    neighborhood: "Montparnasse",
  },
  {
    firstName: "Anaïs",
    lastName: "Leclerc",
    email: "anais.leclerc@demo.fr",
    neighborhood: "Grenelle",
  },
  {
    firstName: "Fabien",
    lastName: "Michaud",
    email: "fabien.michaud@demo.fr",
    neighborhood: "Passy",
  },
  {
    firstName: "Margaux",
    lastName: "Rey",
    email: "margaux.rey@demo.fr",
    neighborhood: "Père-Lachaise",
  },
  {
    firstName: "Cédric",
    lastName: "Hamon",
    email: "cedric.hamon@demo.fr",
    neighborhood: "Père-Lachaise",
  },
  {
    firstName: "Nolwenn",
    lastName: "Le Gall",
    email: "nolwenn.legall@demo.fr",
    neighborhood: "Saint-Germain-des-Prés",
  },
];

const SUBURB_ROWS: PersonRow[] = [
  {
    firstName: "Karim",
    lastName: "Benhamou",
    email: "karim.benhamou@demo.fr",
  },
  {
    firstName: "Justine",
    lastName: "Prévost",
    email: "justine.prevost@demo.fr",
  },
  {
    firstName: "Marc",
    lastName: "Delorme",
    email: "marc.delorme@demo.fr",
  },
  {
    firstName: "Aurélie",
    lastName: "Blanc",
    email: "aurelie.blanc@demo.fr",
  },
  {
    firstName: "Ludovic",
    lastName: "Weber",
    email: "ludovic.weber@demo.fr",
  },
  {
    firstName: "Fatou",
    lastName: "Diallo",
    email: "fatou.diallo@demo.fr",
  },
  {
    firstName: "Grégoire",
    lastName: "Tanguy",
    email: "gregoire.tanguy@demo.fr",
  },
  {
    firstName: "Solène",
    lastName: "Maillard",
    email: "solene.maillard@demo.fr",
  },
  {
    firstName: "Xavier",
    lastName: "Brunel",
    email: "xavier.brunel@demo.fr",
  },
  {
    firstName: "Myriam",
    lastName: "Sassi",
    email: "myriam.sassi@demo.fr",
  },
  {
    firstName: "Benoît",
    lastName: "Carpentier",
    email: "benoit.carpentier@demo.fr",
  },
  {
    firstName: "Delphine",
    lastName: "Arnaud",
    email: "delphine.arnaud@demo.fr",
  },
  {
    firstName: "Sylvain",
    lastName: "Lacombe",
    email: "sylvain.lacombe@demo.fr",
  },
  {
    firstName: "Nathalie",
    lastName: "Ferreira",
    email: "nathalie.ferreira@demo.fr",
  },
  {
    firstName: "Quentin",
    lastName: "Morvan",
    email: "quentin.morvan@demo.fr",
  },
];

const SANCTIONED_ROWS: LocatedRow[] = [
  {
    firstName: "Bruno",
    lastName: "Vidal",
    email: "bruno.vidal@demo.fr",
    neighborhood: "Montmartre",
    role: "banned",
  },
  {
    firstName: "Sonia",
    lastName: "Klein",
    email: "sonia.klein@demo.fr",
    neighborhood: "Montmartre",
    role: "deleted",
  },
  {
    firstName: "Franck",
    lastName: "Aubry",
    email: "franck.aubry@demo.fr",
    neighborhood: "Belleville",
    role: "banned",
  },
  {
    firstName: "Ingrid",
    lastName: "Bertin",
    email: "ingrid.bertin@demo.fr",
    neighborhood: "Bastille",
    role: "banned",
  },
  {
    firstName: "Loïc",
    lastName: "Perrot",
    email: "loic.perrot@demo.fr",
    neighborhood: "Montparnasse",
    role: "banned",
  },
  {
    firstName: "Nina",
    lastName: "Weiss",
    email: "nina.weiss@demo.fr",
    neighborhood: "Marais",
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

function homeAt(address: DemoAddress): DemoAccount["address"] {
  return { label: address.label, lat: address.lat, lng: address.lng };
}

function districtAccount(
  row: PersonRow,
  neighborhood: string,
  address: DemoAddress,
): DemoAccount {
  return {
    ...baseAccount(row, row.role ?? "resident"),
    neighborhood,
    address: homeAt(address),
  };
}

/** No neighborhood: the address sits outside every polygon, so it stays
 *  unattached and shows up in GET /neighborhoods/uncovered-addresses. */
function suburbAccount(row: PersonRow, address: DemoAddress): DemoAccount {
  return { ...baseAccount(row, "resident"), address: homeAt(address) };
}

/** Hands out the real addresses of a neighborhood, one per account. Running out
 *  would silently stack two residents on one doorstep, so it throws instead. */
function addressDealer(): (neighborhood: string) => DemoAddress {
  const taken = new Map<string, number>();
  return (neighborhood) => {
    const pool = NEIGHBORHOOD_ADDRESSES[neighborhood];
    if (!pool) throw new Error(`No addresses for ${neighborhood}`);
    const slot = taken.get(neighborhood) ?? 0;
    if (slot >= pool.length) {
      throw new Error(`${neighborhood} only has ${pool.length} addresses`);
    }
    taken.set(neighborhood, slot + 1);
    return pool[slot];
  };
}

function buildRoster(): DemoAccount[] {
  const nextAddress = addressDealer();
  if (SUBURB_ROWS.length > SUBURB_ADDRESSES.length) {
    throw new Error(`Only ${SUBURB_ADDRESSES.length} suburb addresses`);
  }
  return [
    ...MONTMARTRE_ROWS.map((row) =>
      districtAccount(row, "Montmartre", nextAddress("Montmartre")),
    ),
    ...OTHER_DISTRICT_ROWS.map((row) =>
      districtAccount(row, row.neighborhood, nextAddress(row.neighborhood)),
    ),
    ...SUBURB_ROWS.map((row, index) =>
      suburbAccount(row, SUBURB_ADDRESSES[index]),
    ),
    ...SANCTIONED_ROWS.map((row) =>
      districtAccount(row, row.neighborhood, nextAddress(row.neighborhood)),
    ),
    ...ADMIN_ROWS.map((row) => baseAccount(row, "admin")),
  ];
}

export const ROSTER: DemoAccount[] = buildRoster();
