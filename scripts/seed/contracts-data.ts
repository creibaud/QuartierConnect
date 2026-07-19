/**
 * The booking ledger the jury browses. Every row is replayed through the real
 * endpoints, so the outcome names below describe where the state machine stops,
 * not a column written into Mongo.
 */

export type BookingOutcome =
  /** Left waiting for the owner. */
  | "pending"
  /** Accepted; the generated contract stays a draft nobody signed. */
  | "accepted"
  /** Accepted; the initiator signs alone, leaving the contract partial. */
  | "partial"
  /** Accepted and signed by both parties: paid, completed, HELPED recorded. */
  | "completed"
  /** Turned down by the owner. */
  | "declined"
  /** Withdrawn by the initiator before the owner answered. */
  | "cancelled"
  /** Accepted, then withdrawn: the generated contract is cancelled with it. */
  | "revoked";

export interface BookingPlan {
  /** Title of an active paid listing. */
  service: string;
  initiator: string;
  outcome: BookingOutcome;
}

export const ALICE_EMAIL = "alice@demo.fr";

/**
 * Bookings on Alice's own listings — her "received" tab. She is the payee, so
 * the ones that complete credit her rather than the neighbours' graph.
 */
const ALICE_RECEIVED: BookingPlan[] = [
  {
    service: "Cours de jardinage sur balcon",
    initiator: "camille.bernard@demo.fr",
    outcome: "pending",
  },
  {
    service: "Cours de jardinage sur balcon",
    initiator: "nicolas.fontaine@demo.fr",
    outcome: "pending",
  },
  {
    service: "Initiation à la photo numérique",
    initiator: "emilie.chevalier@demo.fr",
    outcome: "accepted",
  },
  {
    service: "Initiation à la photo numérique",
    initiator: "manon.leroy@demo.fr",
    outcome: "declined",
  },
  {
    service: "Préparation de repas maison pour la semaine",
    initiator: "hugo.marchand@demo.fr",
    outcome: "cancelled",
  },
  {
    service: "Préparation de repas maison pour la semaine",
    initiator: "maxime.renaud@demo.fr",
    outcome: "completed",
  },
  {
    service: "Cours de jardinage sur balcon",
    initiator: "sarah.lemoine@demo.fr",
    outcome: "partial",
  },
];

/**
 * Bookings Alice placed on her neighbours' listings — her "sent" tab. She pays,
 * so the two that complete are the ones feeding the recommendation graph.
 */
const ALICE_SENT: BookingPlan[] = [
  {
    service: "Garde d'enfants après l'école",
    initiator: ALICE_EMAIL,
    outcome: "pending",
  },
  {
    service: "Dépannage informatique à domicile",
    initiator: ALICE_EMAIL,
    outcome: "pending",
  },
  {
    service: "Aide au déménagement de petit volume",
    initiator: ALICE_EMAIL,
    outcome: "accepted",
  },
  {
    service: "Conversation en anglais autour d'un café",
    initiator: ALICE_EMAIL,
    outcome: "declined",
  },
  {
    service: "Cours de cuisine végétarienne",
    initiator: ALICE_EMAIL,
    outcome: "revoked",
  },
  {
    service: "Peinture de petites surfaces",
    initiator: ALICE_EMAIL,
    outcome: "completed",
  },
  {
    service: "Transport de courses lourdes jusqu'à l'étage",
    initiator: ALICE_EMAIL,
    outcome: "completed",
  },
];

/**
 * Settled jobs between neighbours. Thomas, Pauline and Adrien each collect
 * several so the recommendation page has reliable neighbours to surface.
 */
const SETTLED: BookingPlan[] = [
  {
    service: "Dépannage informatique à domicile",
    initiator: "lea.rousseau@demo.fr",
    outcome: "completed",
  },
  {
    service: "Dépannage informatique à domicile",
    initiator: "chloe.barbier@demo.fr",
    outcome: "completed",
  },
  {
    service: "Dépannage informatique à domicile",
    initiator: "guillaume.masson@demo.fr",
    outcome: "completed",
  },
  {
    service: "Peinture de petites surfaces",
    initiator: "amandine.poirier@demo.fr",
    outcome: "completed",
  },
  {
    service: "Peinture de petites surfaces",
    initiator: "kevin.charpentier@demo.fr",
    outcome: "completed",
  },
  {
    service: "Transport de courses lourdes jusqu'à l'étage",
    initiator: "nicolas.fontaine@demo.fr",
    outcome: "completed",
  },
  {
    service: "Transport de courses lourdes jusqu'à l'étage",
    initiator: "emilie.chevalier@demo.fr",
    outcome: "completed",
  },
  {
    service: "Garde d'enfants après l'école",
    initiator: "manon.leroy@demo.fr",
    outcome: "completed",
  },
  {
    service: "Conversation en anglais autour d'un café",
    initiator: "camille.bernard@demo.fr",
    outcome: "completed",
  },
];

/** Contracts stuck on one signature — the other party still has to act. */
const AWAITING_COUNTERSIGNATURE: BookingPlan[] = [
  {
    service: "Montage de meubles en kit",
    initiator: "vincent.dumas@demo.fr",
    outcome: "partial",
  },
  {
    service: "Recherche baby-sitter pour une soirée",
    initiator: "sarah.lemoine@demo.fr",
    outcome: "partial",
  },
];

/** Everyday traffic that never reaches a contract. */
const UNSETTLED: BookingPlan[] = [
  {
    service: "Recherche quelqu'un pour poser une tringle à rideaux",
    initiator: "lea.rousseau@demo.fr",
    outcome: "pending",
  },
  {
    service: "Besoin d'un trajet vers Roissy tôt le matin",
    initiator: "hugo.marchand@demo.fr",
    outcome: "pending",
  },
  {
    service: "Recherche garde d'enfant le mercredi",
    initiator: "elodie.blanchard@demo.fr",
    outcome: "pending",
  },
  {
    service: "Cherche professeur de piano pour ma fille",
    initiator: "maxime.renaud@demo.fr",
    outcome: "pending",
  },
  {
    service: "Besoin d'une personne pour repeindre un couloir",
    initiator: "guillaume.masson@demo.fr",
    outcome: "pending",
  },
  {
    service: "Besoin d'aide pour installer une imprimante",
    initiator: "amandine.poirier@demo.fr",
    outcome: "pending",
  },
  {
    service: "Besoin d'un dépannage pour un robinet qui fuit",
    initiator: "kevin.charpentier@demo.fr",
    outcome: "pending",
  },
  {
    service: "Aide au déménagement de petit volume",
    initiator: "claire.fabre@demo.fr",
    outcome: "pending",
  },
  {
    service: "Montage de meubles en kit",
    initiator: "nadia.benali@demo.fr",
    outcome: "declined",
  },
  {
    service: "Garde d'enfants après l'école",
    initiator: "olivier.deschamps@demo.fr",
    outcome: "declined",
  },
  {
    service: "Cours de cuisine végétarienne",
    initiator: "elodie.blanchard@demo.fr",
    outcome: "declined",
  },
  {
    service: "Besoin d'un trajet vers Roissy tôt le matin",
    initiator: "nicolas.fontaine@demo.fr",
    outcome: "declined",
  },
  {
    service: "Besoin d'une personne pour repeindre un couloir",
    initiator: "chloe.barbier@demo.fr",
    outcome: "declined",
  },
  {
    service: "Recherche baby-sitter pour une soirée",
    initiator: "lea.rousseau@demo.fr",
    outcome: "declined",
  },
  {
    service: "Conversation en anglais autour d'un café",
    initiator: "manon.leroy@demo.fr",
    outcome: "cancelled",
  },
  {
    service: "Transport de courses lourdes jusqu'à l'étage",
    initiator: "camille.bernard@demo.fr",
    outcome: "cancelled",
  },
  {
    service: "Recherche quelqu'un pour poser une tringle à rideaux",
    initiator: "emilie.chevalier@demo.fr",
    outcome: "cancelled",
  },
  {
    service: "Cherche professeur de piano pour ma fille",
    initiator: "sarah.lemoine@demo.fr",
    outcome: "cancelled",
  },
  {
    service: "Besoin d'aide pour installer une imprimante",
    initiator: "hugo.marchand@demo.fr",
    outcome: "cancelled",
  },
];

export const BOOKINGS: BookingPlan[] = [
  ...ALICE_RECEIVED,
  ...ALICE_SENT,
  ...SETTLED,
  ...AWAITING_COUNTERSIGNATURE,
  ...UNSETTLED,
];
