import { fetchExistingTitles } from "./client";
import {
  EVENTS,
  INCIDENTS,
  SERVICES,
  VOTES,
  type IncidentSeed,
  type ServiceSeed,
  type VoteSeed,
} from "./content-data";
import { CONTENT_ADDRESSES } from "./geo";
import { ROSTER } from "./roster";
import { postAs, primeToken, sendAs, warnIfFailed } from "./session";

const ADMIN_EMAIL = "admin@demo.fr";
const ALICE_EMAIL = "alice@demo.fr";

export interface DemoNeighborhood {
  id: string;
  name: string;
  lng: number;
  lat: number;
}

interface Point {
  lng: number;
  lat: number;
}

/**
 * Sanctioned accounts are rejected at login and admin owns no neighborhood, so
 * neither can author neighborhood-scoped content — and a service owned by admin
 * would drop out of `fetchResidents()`, leaving Neo4j without its HELPED edges.
 */
export function authorsIn(neighborhood: string): string[] {
  const emails = ROSTER.filter(
    (account) =>
      account.neighborhood === neighborhood &&
      (account.role === "resident" || account.role === "moderator"),
  ).map((account) => account.email);
  if (emails.length === 0) {
    throw new Error(`No eligible author in ${neighborhood}`);
  }
  return emails;
}

function moderatorIn(neighborhood: string): string | null {
  const moderator = ROSTER.find(
    (account) =>
      account.neighborhood === neighborhood && account.role === "moderator",
  );
  return moderator?.email ?? null;
}

/** Spreads authorship over a whole neighborhood so no list reads as one voice. */
class AuthorRotation {
  private readonly cursors = new Map<string, number>();

  next(neighborhood: string): string {
    const pool = authorsIn(neighborhood);
    const cursor = this.cursors.get(neighborhood) ?? 0;
    this.cursors.set(neighborhood, cursor + 1);
    return pool[cursor % pool.length];
  }
}

/**
 * Pins every demo-neighborhood listing to a real street of that neighborhood,
 * handed out in declaration order. Built once over the three lists so the
 * mapping never depends on which seeder runs first. There are 121 pinned
 * listings for 70 addresses, so the pool wraps and 51 of them host two: a
 * doorway shared by two listings reads as normal, the lattice this replaces
 * drew a visible grid on the dashboard map.
 */
const PINNED_PLACES = new Map<string, Point>(
  [...SERVICES, ...INCIDENTS, ...EVENTS]
    .filter((item) => item.neighborhood === undefined)
    .map((item, index) => {
      const place = CONTENT_ADDRESSES[index % CONTENT_ADDRESSES.length];
      return [item.title, { lng: place.lng, lat: place.lat }];
    }),
);

/** Only demo-neighborhood listings carry a pin: the map screen shows that one. */
function placeOf(title: string): Point | null {
  return PINNED_PLACES.get(title) ?? null;
}

function inDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

/** `neighborhoodId` is deliberately absent: the API replaces it with the
 *  author's own for every non-admin caller anyway. */
function serviceBody(
  service: ServiceSeed,
  place: Point | null,
): Record<string, unknown> {
  return {
    title: service.title,
    description: service.description,
    category: service.category,
    type: service.type,
    direction: service.direction,
    ...(service.duration === undefined ? {} : { duration: service.duration }),
    ...(service.status === undefined ? {} : { status: service.status }),
    ...(place === null
      ? {}
      : { location: { type: "Point", coordinates: [place.lng, place.lat] } }),
  };
}

async function seedServices(
  adminToken: string,
  demo: DemoNeighborhood,
): Promise<void> {
  const existing = await fetchExistingTitles(adminToken, "/services");
  const rotation = new AuthorRotation();
  let created = 0;

  for (const service of SERVICES) {
    const neighborhood = service.neighborhood ?? demo.name;
    // A pinned author skips the rotation, so inserting one leaves every other
    // listing's author untouched.
    const author = service.author ?? rotation.next(neighborhood);
    if (existing.has(service.title)) continue;

    const place = placeOf(service.title);
    const res = await postAs(author, "/services", serviceBody(service, place));
    if (await warnIfFailed(`service "${service.title}"`, res)) created++;
  }
  console.log(
    `  ✓ ${SERVICES.length} service(s) in place (${created} created)`,
  );
}

/** open → in_progress → resolved: the state machine forbids skipping a step. */
async function advanceStatus(
  incidentId: string,
  target: IncidentSeed["status"],
  neighborhood: string,
): Promise<void> {
  const steps = target === "resolved" ? ["in_progress", "resolved"] : [target];
  // A moderator is scoped to their own neighborhood; admin moderates everywhere.
  const moderator = moderatorIn(neighborhood) ?? ADMIN_EMAIL;
  for (const status of steps) {
    const res = await sendAs(moderator, `/incidents/${incidentId}/status`, {
      method: "PATCH",
      body: { status },
    });
    await warnIfFailed(`incident ${incidentId} → ${status}`, res);
  }
}

async function seedIncidents(
  adminToken: string,
  demo: DemoNeighborhood,
): Promise<void> {
  const existing = await fetchExistingTitles(adminToken, "/incidents");
  const rotation = new AuthorRotation();
  const toAdvance: Array<{
    id: string;
    status: IncidentSeed["status"];
    neighborhood: string;
  }> = [];
  let created = 0;

  for (const incident of INCIDENTS) {
    const neighborhood = incident.neighborhood ?? demo.name;
    const author = incident.author ?? rotation.next(neighborhood);
    if (existing.has(incident.title)) continue;

    const place = placeOf(incident.title);
    const res = await postAs(author, "/incidents", {
      title: incident.title,
      description: incident.description,
      category: incident.category,
      ...(place === null ? {} : { lat: place.lat, lng: place.lng }),
    });
    if (!(await warnIfFailed(`incident "${incident.title}"`, res))) continue;
    created++;

    // Drizzle's .returning() answers with an array of one row.
    const [row] = (await res.json()) as Array<{ id: string }>;
    if (incident.status !== "open") {
      toAdvance.push({ id: row.id, status: incident.status, neighborhood });
    }
  }

  // Only what this run created: replaying a transition would be rejected.
  for (const incident of toAdvance) {
    await advanceStatus(incident.id, incident.status, incident.neighborhood);
  }
  console.log(
    `  ✓ ${INCIDENTS.length} incident(s) in place (${created} created, ${toAdvance.length} moderated)`,
  );
}

const MIN_INTERESTED = 4;
const INTERESTED_SPREAD = 6;

/** Attendance has to be claimed one token at a time: the endpoint only ever
 *  adds its own caller. */
async function markInterest(
  eventId: string,
  neighborhood: string,
  seed: number,
): Promise<void> {
  const pool = authorsIn(neighborhood);
  // Capped by the pool: asking the same resident twice is a wasted round-trip.
  const count = Math.min(
    pool.length,
    MIN_INTERESTED + (seed % INTERESTED_SPREAD),
  );
  for (let offset = 0; offset < count; offset++) {
    const attendee = pool[(seed + offset) % pool.length];
    const res = await postAs(attendee, `/events/${eventId}/interest`, {
      interested: true,
      source: offset % 3 === 0 ? "participate" : "swipe",
    });
    await warnIfFailed(`interest on ${eventId}`, res);
  }
}

async function seedEvents(
  adminToken: string,
  demo: DemoNeighborhood,
): Promise<void> {
  const existing = await fetchExistingTitles(adminToken, "/events");
  const rotation = new AuthorRotation();
  const upcoming: Array<{ id: string; neighborhood: string; seed: number }> =
    [];
  let created = 0;

  for (const [index, event] of EVENTS.entries()) {
    const neighborhood = event.neighborhood ?? demo.name;
    const author = rotation.next(neighborhood);
    if (existing.has(event.title)) continue;

    const place = placeOf(event.title);
    const res = await postAs(author, "/events", {
      title: event.title,
      description: event.description,
      category: event.category,
      date: inDays(event.inDays),
      ...(place === null
        ? {}
        : { location: { type: "Point", coordinates: [place.lng, place.lat] } }),
    });
    if (!(await warnIfFailed(`event "${event.title}"`, res))) continue;
    created++;

    const row = (await res.json()) as { _id: string };
    if (event.inDays > 0) {
      upcoming.push({ id: row._id, neighborhood, seed: index });
    }
  }

  for (const event of upcoming) {
    await markInterest(event.id, event.neighborhood, event.seed);
  }
  console.log(`  ✓ ${EVENTS.length} event(s) in place (${created} created)`);
}

interface Ballot {
  choices: string[];
  weights?: Record<string, number>;
}

const MAX_WEIGHT = 4;

function ballotFor(vote: VoteSeed, voter: number): Ballot {
  const ids = vote.options.map((option) => option.id);
  if (vote.voteType === "multiple_choice") {
    return {
      choices: [ids[voter % ids.length], ids[(voter + 1) % ids.length]],
    };
  }
  if (vote.voteType === "weighted") {
    const weights: Record<string, number> = {};
    ids.forEach((id, rank) => {
      weights[id] = ((voter + rank) % MAX_WEIGHT) + 1;
    });
    return { choices: ids, weights };
  }
  return { choices: [ids[voter % ids.length]] };
}

const MIN_VOTERS = 6;
const VOTERS_SPREAD = 5;

interface Ballotbox {
  voteId: string;
  vote: VoteSeed;
  seed: number;
  voters: string[];
}

async function castBallots(box: Ballotbox): Promise<void> {
  const { voteId, vote, seed } = box;
  if (vote.aliceVotes) {
    const res = await postAs(
      ALICE_EMAIL,
      `/community-votes/${voteId}/cast`,
      ballotFor(vote, seed),
    );
    await warnIfFailed(`alice's ballot on "${vote.title}"`, res);
  }
  // Alice is excluded here: a second ballot from her would be a 409.
  const pool = box.voters.filter((email) => email !== ALICE_EMAIL);
  const count = Math.min(pool.length, MIN_VOTERS + (seed % VOTERS_SPREAD));
  for (let offset = 0; offset < count; offset++) {
    const voter = pool[(seed + offset) % pool.length];
    const res = await postAs(
      voter,
      `/community-votes/${voteId}/cast`,
      ballotFor(vote, seed + offset),
    );
    await warnIfFailed(`ballot on "${vote.title}"`, res);
  }
}

async function seedVotes(
  adminToken: string,
  demo: DemoNeighborhood,
): Promise<void> {
  const existing = await fetchExistingTitles(adminToken, "/community-votes");
  const rotation = new AuthorRotation();
  const voters = authorsIn(demo.name);
  let created = 0;
  let closed = 0;

  for (const [index, vote] of VOTES.entries()) {
    const author = rotation.next(demo.name);
    if (existing.has(vote.title)) continue;

    const res = await postAs(author, "/community-votes", {
      title: vote.title,
      description: vote.description,
      voteType: vote.voteType,
      options: vote.options,
      endsAt: inDays(vote.endsInDays),
    });
    if (!(await warnIfFailed(`vote "${vote.title}"`, res))) continue;
    created++;

    const row = (await res.json()) as { _id: string };
    await castBallots({ voteId: row._id, vote, seed: index, voters });
    if (!vote.closed) continue;

    // Closing is reserved to the creator or an admin, and casts must land first.
    const closeRes = await postAs(
      ADMIN_EMAIL,
      `/community-votes/${row._id}/close`,
      {},
    );
    if (await warnIfFailed(`closing "${vote.title}"`, closeRes)) closed++;
  }
  console.log(
    `  ✓ ${VOTES.length} community vote(s) in place (${created} created, ${closed} closed)`,
  );
}

export async function seedContent(
  adminToken: string,
  demo: DemoNeighborhood,
): Promise<void> {
  // Reuse the caller's admin session rather than burning a shared TOTP code.
  primeToken(ADMIN_EMAIL, adminToken);

  await seedServices(adminToken, demo);
  await seedIncidents(adminToken, demo);
  await seedEvents(adminToken, demo);
  await seedVotes(adminToken, demo);
}
