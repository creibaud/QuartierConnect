import { fetchList, pgQuery, totp, waitForNextTotpWindow } from "./client";
import { BOOKINGS, type BookingPlan } from "./contracts-data";
import { ROSTER } from "./roster";
import { getAs, postAs, warnIfFailed } from "./session";

interface ServiceRef {
  id: string;
  owner: string;
  direction: string;
}

interface RequestedBooking {
  plan: BookingPlan;
  service: ServiceRef;
  id: string;
}

interface AcceptedBooking {
  plan: BookingPlan;
  bookingId: string;
  contractId: string;
  payer: string;
  payee: string;
}

interface SignatureJob {
  contractId: string;
  signer: string;
  secret: string;
  /** Why the last attempt bounced, so a job that never lands can say so. */
  lastError?: string;
}

/** A signer burns one TOTP code per contract, and the replay guard keys on the
 *  code — so a second signature from the same secret needs the next window. */
const MAX_SIGNATURE_ROUNDS = 8;

function secretFor(email: string): string {
  const account = ROSTER.find((entry) => entry.email === email);
  if (!account) throw new Error(`${email} is missing from the roster`);
  return account.totpSecret;
}

/** `psql -t` prints `value | value` rows with alignment padding. */
function emailsByUserId(): Map<string, string> {
  const rows = pgQuery("SELECT id, email FROM users;");
  const index = new Map<string, string>();
  for (const line of rows.split("\n")) {
    const [id, email] = line.split("|").map((cell) => cell.trim());
    if (id && email) index.set(id, email);
  }
  return index;
}

/** Only paid, open listings can be booked at all. */
async function bookableServices(
  adminToken: string,
): Promise<Map<string, ServiceRef>> {
  const emails = emailsByUserId();
  const services = await fetchList<{
    _id: string;
    title: string;
    type: string;
    status: string;
    direction: string;
    createdBy: string;
  }>(adminToken, "/services");

  const index = new Map<string, ServiceRef>();
  for (const service of services) {
    if (service.type !== "paid" || service.status === "closed") continue;
    const owner = emails.get(service.createdBy);
    if (!owner) continue;
    index.set(service.title, {
      id: service._id,
      owner,
      direction: service.direction,
    });
  }
  return index;
}

/** On a request listing the owner pays the neighbour who answers; on an offer
 *  the initiator pays. Mirrors `resolveParties` on the API side. */
function partiesOf(
  service: ServiceRef,
  initiator: string,
): { payer: string; payee: string } {
  return service.direction === "request"
    ? { payer: service.owner, payee: initiator }
    : { payer: initiator, payee: service.owner };
}

async function requestBookings(
  services: Map<string, ServiceRef>,
): Promise<{ created: RequestedBooking[]; inPlace: number }> {
  const initiators = [...new Set(BOOKINGS.map((plan) => plan.initiator))];
  const existing = await bookedServiceIdsByEmail(initiators);
  const created: RequestedBooking[] = [];
  let inPlace = 0;

  for (const plan of BOOKINGS) {
    const service = services.get(plan.service);
    if (!service) {
      console.warn(`  ! no bookable listing named "${plan.service}"`);
      continue;
    }
    if (existing.get(plan.initiator)?.has(service.id)) {
      inPlace++;
      continue;
    }

    const res = await postAs(plan.initiator, "/bookings", {
      serviceId: service.id,
    });
    if (!(await warnIfFailed(`booking on "${plan.service}"`, res))) continue;
    const booking = (await res.json()) as { _id: string };
    created.push({ plan, service, id: booking._id });
    inPlace++;
  }
  return { created, inPlace };
}

/** Maps the id-based booking list back onto the roster emails the plan uses. */
async function bookedServiceIdsByEmail(
  initiators: string[],
): Promise<Map<string, Set<string>>> {
  const emails = emailsByUserId();
  const idByEmail = new Map(
    [...emails].map(([id, email]) => [email, id] as const),
  );
  const index = new Map<string, Set<string>>();
  for (const initiator of initiators) {
    const bookings = await getAs<{ serviceId: string; initiatorId: string }>(
      initiator,
      "/bookings",
    );
    const initiatorId = idByEmail.get(initiator);
    index.set(
      initiator,
      new Set(
        bookings
          .filter((booking) => booking.initiatorId === initiatorId)
          .map((booking) => booking.serviceId),
      ),
    );
  }
  return index;
}

const OWNER_ANSWERED = new Set(["accepted", "partial", "completed", "revoked"]);

/**
 * Walks every fresh booking to the state its plan asks for. Acceptance is what
 * mints the contract, so it runs before anything that needs a contract id.
 */
async function settleBookings(
  created: RequestedBooking[],
): Promise<AcceptedBooking[]> {
  const accepted: AcceptedBooking[] = [];

  for (const { plan, service, id } of created) {
    if (plan.outcome === "declined") {
      const res = await postAs(service.owner, `/bookings/${id}/decline`, {});
      await warnIfFailed(`declining "${plan.service}"`, res);
      continue;
    }
    if (plan.outcome === "cancelled") {
      const res = await postAs(plan.initiator, `/bookings/${id}/cancel`, {});
      await warnIfFailed(`cancelling "${plan.service}"`, res);
      continue;
    }
    if (!OWNER_ANSWERED.has(plan.outcome)) continue;

    const res = await postAs(service.owner, `/bookings/${id}/accept`, {});
    if (!(await warnIfFailed(`accepting "${plan.service}"`, res))) continue;
    const booking = (await res.json()) as { contractId: string | null };
    if (!booking.contractId) {
      console.warn(`  ! accepting "${plan.service}" produced no contract`);
      continue;
    }
    accepted.push({
      plan,
      bookingId: id,
      contractId: booking.contractId,
      ...partiesOf(service, plan.initiator),
    });
  }
  return accepted;
}

/** Cancelling an accepted booking is what leaves a cancelled contract behind. */
async function revokeAccepted(accepted: AcceptedBooking[]): Promise<number> {
  let revoked = 0;
  for (const booking of accepted) {
    if (booking.plan.outcome !== "revoked") continue;
    const res = await postAs(
      booking.plan.initiator,
      `/bookings/${booking.bookingId}/cancel`,
      {},
    );
    if (await warnIfFailed(`revoking "${booking.plan.service}"`, res))
      revoked++;
  }
  return revoked;
}

function signatureJobs(accepted: AcceptedBooking[]): SignatureJob[] {
  const jobs: SignatureJob[] = [];
  for (const booking of accepted) {
    const { outcome, initiator } = booking.plan;
    // A partial contract stops at the initiator; a completed one needs both.
    const signers =
      outcome === "partial"
        ? [initiator]
        : outcome === "completed"
          ? [booking.payer, booking.payee]
          : [];
    for (const signer of signers) {
      jobs.push({
        contractId: booking.contractId,
        signer,
        secret: secretFor(signer),
      });
    }
  }
  return jobs;
}

/**
 * Signs in rounds of one code per secret. Alice, Bob and the admin share a
 * secret, so the rounds key on the secret rather than on the signer; whatever a
 * round defers is retried once the next code is mintable.
 */
async function signContracts(jobs: SignatureJob[]): Promise<number> {
  let pending = jobs;
  let signed = 0;

  for (
    let round = 1;
    pending.length > 0 && round <= MAX_SIGNATURE_ROUNDS;
    round++
  ) {
    const spent = new Set<string>();
    const deferred: SignatureJob[] = [];

    for (const job of pending) {
      if (spent.has(job.secret)) {
        deferred.push(job);
        continue;
      }
      spent.add(job.secret);
      const res = await postAs(
        job.signer,
        `/contracts/${job.contractId}/sign`,
        {
          totpCode: totp(job.secret),
        },
      );
      if (res.ok) {
        signed++;
        continue;
      }
      job.lastError = `${res.status}: ${await res.text()}`;
      deferred.push(job);
    }

    pending = deferred;
    if (pending.length > 0) await waitForNextTotpWindow();
  }

  for (const job of pending) {
    console.warn(
      `  ! ${job.signer} never signed ${job.contractId} (${job.lastError ?? "no attempt"})`,
    );
  }
  return signed;
}

export async function seedContracts(adminToken: string): Promise<void> {
  const services = await bookableServices(adminToken);
  const { created, inPlace } = await requestBookings(services);
  console.log(
    `  ✓ ${inPlace}/${BOOKINGS.length} booking(s) in place (${created.length} created)`,
  );

  const accepted = await settleBookings(created);
  const revoked = await revokeAccepted(accepted);
  const signed = await signContracts(signatureJobs(accepted));
  console.log(
    `  ✓ ${accepted.length} contract(s) generated (${signed} signature(s), ${revoked} cancelled)`,
  );
}
