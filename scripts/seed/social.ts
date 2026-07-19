/**
 * What residents do to each other's content: conversations, service responses,
 * likes and event attendance. Runs after the content phase, which owns the
 * listings, incidents and events this module reacts to.
 */
import { fetchList, mongoEval, mongoJson, pgQuery, request } from "./client";
import { authorsIn, type DemoNeighborhood } from "./content";
import {
  fleaMarketPoster,
  gardenPhoto,
  meetingReportPdf,
  voiceNote,
  type Attachment,
} from "./media";
import { postAs, tokenFor, warnIfFailed } from "./session";

const ALICE_EMAIL = "alice@demo.fr";

interface Line {
  from: string;
  text?: string;
  attachment?: Attachment;
  /** Held in Mongo but filtered out of the history: covers the deleted state. */
  deleted?: boolean;
}

interface Thread {
  /** Alice is added by the API on every call; these are the other members. */
  others: string[];
  groupName: string | null;
  lines: Line[];
  /** Minutes before the thread anchor, descending. Defaults to a steady drip. */
  offsetsInMinutes?: number[];
}

/**
 * The showcase thread runs over two days in four bursts rather than at a steady
 * cadence, which is what a real exchange looks like once it is opened.
 */
const SHOWCASE_OFFSETS_MINUTES = [
  2880, 2875, 2870, 2862, 2855, 2850, 1500, 1495, 1490, 1480, 1470, 1465, 1460,
  420, 415, 405, 90, 85, 40, 35, 20, 0,
];

/**
 * Ordered newest first: the conversation list is sorted on `lastMessageAt`, so
 * this array is the order the jury sees. The first two threads close on someone
 * other than Alice, which is what puts an unread marker on them.
 */
const THREADS: Thread[] = [
  {
    others: ["camille.bernard@demo.fr"],
    groupName: null,
    offsetsInMinutes: SHOWCASE_OFFSETS_MINUTES,
    lines: [
      {
        from: "camille.bernard@demo.fr",
        text: "Bonjour Alice, je vois que tu proposes un coup de main pour le jardin partagé, c'est toujours d'actualité ?",
      },
      {
        from: ALICE_EMAIL,
        text: "Bonjour Camille ! Oui bien sûr, je suis disponible la plupart des samedis matin.",
      },
      {
        from: "camille.bernard@demo.fr",
        text: "Parfait. Il y a un carré de 4 m² à retourner avant les semis.",
      },
      {
        from: ALICE_EMAIL,
        text: "Ça se fait en deux heures à deux. Tu as les outils ou j'apporte les miens ?",
      },
      {
        from: "camille.bernard@demo.fr",
        text: "J'ai une bêche et un râteau, il manque surtout des gants.",
      },
      {
        from: ALICE_EMAIL,
        text: "J'en ai une paire en rab, je les prends.",
      },
      { from: "camille.bernard@demo.fr", attachment: gardenPhoto() },
      {
        from: "camille.bernard@demo.fr",
        text: "Voilà l'état actuel, la terre est un peu tassée.",
      },
      {
        from: ALICE_EMAIL,
        text: "Vu la photo, on ajoutera du compost. La régie de quartier en distribue gratuitement rue Ordener.",
      },
      {
        from: "camille.bernard@demo.fr",
        text: "Je ne savais pas du tout, bon à savoir.",
      },
      { from: ALICE_EMAIL, text: "Je passe en prendre deux sacs vendredi." },
      {
        from: "camille.bernard@demo.fr",
        text: "Super. Samedi 10h, ça te va ?",
      },
      { from: ALICE_EMAIL, text: "10h c'est noté." },
      { from: "camille.bernard@demo.fr", attachment: meetingReportPdf() },
      {
        from: "camille.bernard@demo.fr",
        text: "Je te mets le compte rendu de la dernière réunion, le plan des parcelles est à la fin.",
      },
      { from: ALICE_EMAIL, text: "Merci, je regarde ça ce soir." },
      {
        from: ALICE_EMAIL,
        text: "Le code du portail est le 4 B 27 41, note-le quelque part.",
        deleted: true,
      },
      {
        from: ALICE_EMAIL,
        text: "Je préfère te donner le code du portail de vive voix samedi, c'est plus prudent.",
      },
      { from: "camille.bernard@demo.fr", attachment: voiceNote() },
      {
        from: "camille.bernard@demo.fr",
        text: "Petit vocal, j'avais les mains dans la terre.",
      },
      {
        from: ALICE_EMAIL,
        text: "Écouté, c'est noté pour le tour d'arrosage de juillet.",
      },
      { from: "camille.bernard@demo.fr", attachment: fleaMarketPoster() },
    ],
  },
  {
    others: ["julien.moreau@demo.fr"],
    groupName: null,
    lines: [
      {
        from: "julien.moreau@demo.fr",
        text: "Bonsoir Alice, tu aurais une perceuse à me prêter ce week-end ?",
      },
      {
        from: ALICE_EMAIL,
        text: "Oui, une visseuse-perceuse sans fil. Tu peux passer samedi après-midi.",
      },
      { from: "julien.moreau@demo.fr", text: "Nickel, je passe vers 15h." },
    ],
  },
  {
    others: ["bob@demo.fr", "chloe.barbier@demo.fr", "maxime.renaud@demo.fr"],
    groupName: "Vide-grenier de la rue Lepic",
    lines: [
      {
        from: "bob@demo.fr",
        text: "On se cale sur le 14 septembre pour le vide-grenier ?",
      },
      {
        from: "chloe.barbier@demo.fr",
        text: "Le 14 me va, j'ai déjà deux tables à prêter.",
      },
      {
        from: "maxime.renaud@demo.fr",
        text: "Pareil pour moi, je peux gérer l'inscription des exposants.",
      },
      {
        from: ALICE_EMAIL,
        text: "Parfait, je réserve l'emplacement auprès de la mairie du 18e cette semaine.",
      },
    ],
  },
  {
    others: ["sophie.lefevre@demo.fr"],
    groupName: null,
    lines: [
      {
        from: ALICE_EMAIL,
        text: "Bonjour Sophie, merci beaucoup pour le dépannage de mardi soir.",
      },
      {
        from: "sophie.lefevre@demo.fr",
        text: "Avec plaisir, c'était trois fois rien.",
      },
      {
        from: ALICE_EMAIL,
        text: "Je te dois un café, dis-moi quand tu passes.",
      },
    ],
  },
  {
    others: ["thomas.girard@demo.fr"],
    groupName: null,
    lines: [
      {
        from: "thomas.girard@demo.fr",
        text: "La réunion de copropriété est décalée au 12, tu es toujours partante ?",
      },
      {
        from: ALICE_EMAIL,
        text: "Oui, je note le 12. L'ordre du jour a changé ?",
      },
      {
        from: "thomas.girard@demo.fr",
        text: "Seulement le point sur le local à vélos.",
      },
      { from: ALICE_EMAIL, text: "Très bien, à mardi alors." },
    ],
  },
  {
    others: ["lea.rousseau@demo.fr"],
    groupName: null,
    lines: [
      {
        from: "lea.rousseau@demo.fr",
        text: "Tu connais quelqu'un qui donne des cours de soutien en maths dans le quartier ?",
      },
      {
        from: ALICE_EMAIL,
        text: "Nicolas propose de l'aide aux devoirs sur l'appli, regarde dans les services.",
      },
      { from: ALICE_EMAIL, text: "Il habite juste rue Caulaincourt." },
    ],
  },
  {
    others: ["nicolas.fontaine@demo.fr"],
    groupName: null,
    lines: [
      {
        from: "nicolas.fontaine@demo.fr",
        text: "Merci d'avoir signalé le lampadaire cassé, la mairie est passée hier.",
      },
      {
        from: ALICE_EMAIL,
        text: "Bonne nouvelle, la rue était vraiment sombre le soir.",
      },
      { from: ALICE_EMAIL, text: "Je clôture le signalement du coup." },
    ],
  },
  {
    others: ["emilie.chevalier@demo.fr"],
    groupName: null,
    lines: [
      {
        from: "emilie.chevalier@demo.fr",
        text: "Tu gardes toujours des chats pendant les vacances ?",
      },
      { from: ALICE_EMAIL, text: "Oui, du 10 au 20 août je suis à Paris." },
      { from: ALICE_EMAIL, text: "Envoie-moi les dates dès que c'est calé." },
    ],
  },
  {
    others: ["antoine.perrin@demo.fr"],
    groupName: null,
    lines: [
      {
        from: "antoine.perrin@demo.fr",
        text: "Le composteur de la place Constantin-Pecqueur déborde.",
      },
      {
        from: ALICE_EMAIL,
        text: "Je l'ai signalé ce matin, la régie passe vendredi.",
      },
      {
        from: ALICE_EMAIL,
        text: "En attendant mieux vaut ne rien y déposer.",
      },
    ],
  },
  {
    others: ["manon.leroy@demo.fr"],
    groupName: null,
    lines: [
      {
        from: "manon.leroy@demo.fr",
        text: "Bonjour, je viens d'emménager rue des Abbesses, des conseils ?",
      },
      {
        from: ALICE_EMAIL,
        text: "Bienvenue ! Le marché du mardi place des Abbesses vaut vraiment le détour.",
      },
      {
        from: ALICE_EMAIL,
        text: "Et il y a un groupe entraide sur l'appli, je t'y ajoute.",
      },
    ],
  },
  {
    others: ["hugo.marchand@demo.fr"],
    groupName: null,
    lines: [
      {
        from: "hugo.marchand@demo.fr",
        text: "J'ai récupéré les clés du local, je te les dépose quand ?",
      },
      {
        from: ALICE_EMAIL,
        text: "Demain matin si tu peux, je suis chez moi jusqu'à 11h.",
      },
      { from: ALICE_EMAIL, text: "Sinon laisse-les à la loge." },
    ],
  },
];

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
/** Threads sit far enough apart that their own spread cannot reorder the list. */
const THREAD_SPACING_MS = 5 * HOUR_MS;
const REPLY_GAP_MINUTES = 4;

function messageTimes(thread: Thread, threadIndex: number): Date[] {
  const anchor = Date.now() - threadIndex * THREAD_SPACING_MS - 5 * MINUTE_MS;
  const offsets =
    thread.offsetsInMinutes ??
    thread.lines.map(
      (_line, index) => (thread.lines.length - 1 - index) * REPLY_GAP_MINUTES,
    );
  return offsets.map((minutes) => new Date(anchor - minutes * MINUTE_MS));
}

interface ConversationRow {
  _id: string;
  isGroup: boolean;
  groupName: string | null;
}

function threadLabel(thread: Thread): string {
  return thread.groupName ?? thread.others[0];
}

async function conversationFor(
  thread: Thread,
  idByEmail: Map<string, string>,
  known: ConversationRow[],
  neighborhoodId: string,
): Promise<string | null> {
  const participants = thread.others.map((email) => idByEmail.get(email));
  if (participants.some((id) => id === undefined)) {
    console.warn(`  ! unknown participant in "${threadLabel(thread)}"`);
    return null;
  }

  // One-to-one creation is idempotent server-side. A group is not: the API
  // skips the dedupe as soon as isGroup is set, so a replay would clone it.
  if (thread.groupName !== null) {
    const existing = known.find(
      (conversation) =>
        conversation.isGroup && conversation.groupName === thread.groupName,
    );
    if (existing) return existing._id;
  }

  const res = await postAs(ALICE_EMAIL, "/messaging/conversations", {
    participants,
    ...(thread.groupName === null
      ? {}
      : { isGroup: true, groupName: thread.groupName, neighborhoodId }),
  });
  if (!(await warnIfFailed(`conversation "${threadLabel(thread)}"`, res))) {
    return null;
  }
  const conversation = (await res.json()) as ConversationRow;
  return conversation._id;
}

/** Uploads are the only route that mints a fileId, and every non-text bubble
 *  needs one to render. Returns the id of the message the API created. */
async function uploadAs(
  email: string,
  conversationId: string,
  attachment: Attachment,
): Promise<string | null> {
  const token = await tokenFor(email);
  const form = new FormData();
  form.append(
    "file",
    new Blob([new Uint8Array(attachment.bytes)], { type: attachment.mimeType }),
    attachment.fileName,
  );
  const res = await request(
    `/messaging/conversations/${conversationId}/upload`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    },
  );
  if (!(await warnIfFailed(`upload "${attachment.fileName}"`, res)))
    return null;
  const message = (await res.json()) as { _id: string };
  return message._id;
}

interface TextDocument {
  conversationId: string;
  senderId: string;
  type: "text";
  content: string;
  fileId: null;
  fileName: null;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
}

async function fillThread(
  conversationId: string,
  thread: Thread,
  times: Date[],
  idByEmail: Map<string, string>,
): Promise<number> {
  const documents: TextDocument[] = [];
  const backdated: Array<{ id: string; at: string }> = [];

  for (const [index, line] of thread.lines.entries()) {
    const at = times[index].toISOString();
    if (line.attachment) {
      const messageId = await uploadAs(
        line.from,
        conversationId,
        line.attachment,
      );
      // The upload stamps the message "now": move it back into the story.
      if (messageId) backdated.push({ id: messageId, at });
      continue;
    }
    documents.push({
      conversationId,
      senderId: idByEmail.get(line.from) ?? "",
      type: "text",
      content: line.text ?? "",
      fileId: null,
      fileName: null,
      deleted: line.deleted ?? false,
      createdAt: at,
      updatedAt: at,
    });
  }

  const lastMessageAt = times[times.length - 1].toISOString();
  mongoEval(`
    const documents = ${JSON.stringify(documents)};
    const backdated = ${JSON.stringify(backdated)};
    if (documents.length > 0) {
      db.messages.insertMany(documents.map((document) => ({
        ...document,
        createdAt: new Date(document.createdAt),
        updatedAt: new Date(document.updatedAt),
      })));
    }
    for (const message of backdated) {
      db.messages.updateOne(
        { _id: new ObjectId(message.id) },
        { $set: { createdAt: new Date(message.at), updatedAt: new Date(message.at) } },
      );
    }
    db.conversations.updateOne(
      { _id: new ObjectId(${JSON.stringify(conversationId)}) },
      { $set: { lastMessageAt: new Date(${JSON.stringify(lastMessageAt)}) } },
    );
  `);

  return documents.length + backdated.length;
}

async function seedConversations(
  demo: DemoNeighborhood,
  idByEmail: Map<string, string>,
): Promise<void> {
  // Read from Mongo, not the HTTP list: that one answers with an empty array on
  // any failure, and an empty list here would clone the group thread.
  const known = mongoJson<ConversationRow[]>(`
    db.conversations.find({ isGroup: true }, { groupName: 1, isGroup: 1 })
      .toArray().map((row) => ({ ...row, _id: row._id.toString() }))
  `);

  const conversationIds: Array<string | null> = [];
  for (const thread of THREADS) {
    conversationIds.push(
      await conversationFor(thread, idByEmail, known, demo.id),
    );
  }

  const filled = mongoJson<Record<string, number>>(`
    Object.fromEntries(db.messages.aggregate([
      { $match: { conversationId: { $in: ${JSON.stringify(conversationIds.filter(Boolean))} } } },
      { $group: { _id: "$conversationId", total: { $sum: 1 } } },
    ]).toArray().map((row) => [row._id, row.total]))
  `);

  let messages = 0;
  for (const [index, thread] of THREADS.entries()) {
    const conversationId = conversationIds[index];
    if (conversationId === null) continue;
    // A thread that already holds messages is left alone: replaying the uploads
    // would duplicate every bubble.
    if (filled[conversationId]) continue;
    messages += await fillThread(
      conversationId,
      thread,
      messageTimes(thread, index),
      idByEmail,
    );
  }

  console.log(
    `  ✓ ${THREADS.length} conversation(s) in place (${messages} message(s) written)`,
  );
}

interface ServiceRow {
  _id: string;
  title: string;
  createdBy: string;
  neighborhoodId: string;
}

const SERVICE_RESPONSE_TARGETS = 20;
/** Cycles so no listing looks templated; 20 listings average three responders. */
const RESPONDER_COUNTS = [3, 2, 4, 3];
const ALICE_OWNED_SHOWCASE = 3;
const ALICE_RESPONSES = 4;

/** Alice's listings land on indices 0, 1 and 3, which draw 3, 2 and 3
 *  responders — the 2-3 her "my services" page has to show. */
function responseTargets(
  owned: ServiceRow[],
  others: ServiceRow[],
): ServiceRow[] {
  const mine = owned.slice(0, ALICE_OWNED_SHOWCASE);
  return [mine[0], mine[1], others[0], mine[2], ...others.slice(1)]
    .filter((service): service is ServiceRow => service !== undefined)
    .slice(0, SERVICE_RESPONSE_TARGETS);
}

function respondersFor(
  pool: string[],
  service: ServiceRow,
  index: number,
  answeredByAlice: Set<string>,
  idByEmail: Map<string, string>,
): string[] {
  const count = RESPONDER_COUNTS[index % RESPONDER_COUNTS.length];
  // Answering your own listing is a 403, and Alice is placed by hand below.
  const eligible = pool.filter(
    (email) =>
      email !== ALICE_EMAIL && idByEmail.get(email) !== service.createdBy,
  );
  const chosen = answeredByAlice.has(service._id) ? [ALICE_EMAIL] : [];
  for (let step = 0; chosen.length < count; step++) {
    chosen.push(eligible[(index * 3 + step) % eligible.length]);
  }
  return chosen;
}

async function seedServiceResponses(
  adminToken: string,
  demo: DemoNeighborhood,
  idByEmail: Map<string, string>,
): Promise<void> {
  const aliceId = idByEmail.get(ALICE_EMAIL);
  const local = (await fetchList<ServiceRow>(adminToken, "/services")).filter(
    (service) => service.neighborhoodId === demo.id,
  );
  const owned = local.filter((service) => service.createdBy === aliceId);
  const others = local.filter((service) => service.createdBy !== aliceId);
  if (owned.length < ALICE_OWNED_SHOWCASE) {
    console.warn(
      `  ! alice owns ${owned.length} listing(s), the showcase wants ${ALICE_OWNED_SHOWCASE}`,
    );
  }

  const targets = responseTargets(owned, others);
  // Fills Alice's "services I answered" tab.
  const answeredByAlice = new Set(
    others.slice(0, ALICE_RESPONSES).map((service) => service._id),
  );
  const pool = authorsIn(demo.name);

  let responses = 0;
  for (const [index, service] of targets.entries()) {
    const responders = respondersFor(
      pool,
      service,
      index,
      answeredByAlice,
      idByEmail,
    );
    for (const responder of responders) {
      const res = await postAs(
        responder,
        `/services/${service._id}/respond`,
        {},
      );
      if (await warnIfFailed(`response on "${service.title}"`, res))
        responses++;
    }
  }
  console.log(
    `  ✓ ${responses} service response(s) over ${targets.length} listing(s)`,
  );
}

interface EventRow {
  _id: string;
  title: string;
  date: string;
  createdBy: string;
  neighborhoodId: string;
  interestedUserIds?: string[];
}

function upcomingIn(demo: DemoNeighborhood, events: EventRow[]): EventRow[] {
  const now = Date.now();
  return events.filter(
    (event) => event.neighborhoodId === demo.id && Date.parse(event.date) > now,
  );
}

function pastIn(demo: DemoNeighborhood, events: EventRow[]): EventRow[] {
  const now = Date.now();
  return events.filter(
    (event) =>
      event.neighborhoodId === demo.id && Date.parse(event.date) <= now,
  );
}

type VoteTargetType = "service" | "event" | "incident";

interface VoteTarget {
  targetType: VoteTargetType;
  targetId: string;
  ownerId: string | null;
}

const VOTED_SERVICES = 8;
const VOTED_EVENTS = 6;
const VOTED_INCIDENTS = 6;
const VOTERS_PER_TARGET = 2;
/** One vote in eight goes against: a board where nothing is ever disliked
 *  reads as fabricated, and the score widget never shows its negative side. */
const NEGATIVE_EVERY = 8;
const ALICE_VOTES_EVERY = 4;

function voteTypeFor(targetType: VoteTargetType, index: number): string {
  const negative = index % NEGATIVE_EVERY === NEGATIVE_EVERY - 1;
  // Services and events take like/dislike, incidents take up/down; the API
  // rejects any other pairing with a 400.
  if (targetType === "incident") return negative ? "down" : "up";
  return negative ? "dislike" : "like";
}

async function voteTargets(
  adminToken: string,
  demo: DemoNeighborhood,
): Promise<VoteTarget[]> {
  const services = (await fetchList<ServiceRow>(adminToken, "/services"))
    .filter((service) => service.neighborhoodId === demo.id)
    .slice(0, VOTED_SERVICES)
    .map((service) => ({
      targetType: "service" as const,
      targetId: service._id,
      ownerId: service.createdBy,
    }));

  const events = upcomingIn(
    demo,
    await fetchList<EventRow>(adminToken, "/events"),
  )
    .slice(0, VOTED_EVENTS)
    .map((event) => ({
      targetType: "event" as const,
      targetId: event._id,
      ownerId: event.createdBy,
    }));

  // Incidents live in Postgres, so their targetId is a UUID, not a Mongo id.
  const incidents = pgQuery(
    `SELECT id FROM incidents WHERE deleted_at IS NULL
     ORDER BY id LIMIT ${VOTED_INCIDENTS}`,
  )
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((id) => ({
      targetType: "incident" as const,
      targetId: id,
      ownerId: null,
    }));

  return [...services, ...events, ...incidents];
}

function votersFor(
  pool: string[],
  target: VoteTarget,
  index: number,
  idByEmail: Map<string, string>,
): string[] {
  const eligible = pool.filter(
    (email) => idByEmail.get(email) !== target.ownerId,
  );
  const chosen: string[] = [];
  // Alice votes on one target in four: her own screens must show a cast state.
  if (index % ALICE_VOTES_EVERY === 0 && eligible.includes(ALICE_EMAIL)) {
    chosen.push(ALICE_EMAIL);
  }
  for (let step = 0; chosen.length < VOTERS_PER_TARGET; step++) {
    const candidate = eligible[(index * 5 + step) % eligible.length];
    if (!chosen.includes(candidate)) chosen.push(candidate);
  }
  return chosen;
}

async function seedLikes(
  adminToken: string,
  demo: DemoNeighborhood,
  idByEmail: Map<string, string>,
): Promise<void> {
  const targets = await voteTargets(adminToken, demo);
  const pool = authorsIn(demo.name);
  const alreadyCast = new Set(
    mongoJson<Array<{ userId: string; targetId: string; targetType: string }>>(
      "db.votes.find({}, { _id: 0, userId: 1, targetId: 1, targetType: 1 }).toArray()",
    ).map((vote) => `${vote.userId}|${vote.targetType}|${vote.targetId}`),
  );

  let cast = 0;
  let planned = 0;
  for (const [index, target] of targets.entries()) {
    for (const voter of votersFor(pool, target, index, idByEmail)) {
      // Counted before the skip so the negative pattern stays put on a replay.
      const voteType = voteTypeFor(target.targetType, planned++);
      const key = `${idByEmail.get(voter)}|${target.targetType}|${target.targetId}`;
      // POST /votes toggles: casting the same vote twice deletes it, so a
      // second seed run has to leave existing votes alone.
      if (alreadyCast.has(key)) continue;
      const res = await postAs(voter, "/votes", {
        targetType: target.targetType,
        targetId: target.targetId,
        voteType,
      });
      if (await warnIfFailed(`${voteType} on a ${target.targetType}`, res)) {
        cast++;
      }
    }
  }
  console.log(`  ✓ ${planned} vote(s) planned (${cast} newly cast)`);
}

const INTEREST_FLOOR = 5;
/** Floor plus 0 to 10, so attendance runs from 5 to 15 across the agenda. */
const INTEREST_SPREAD = 11;
/** Past events draw a little less than the ones still being promoted. */
const PAST_INTEREST_FLOOR = 4;
const ALICE_INTERESTS = 4;

async function markAliceInterest(
  events: EventRow[],
  aliceId: string,
): Promise<number> {
  let total = events.filter((event) =>
    (event.interestedUserIds ?? []).includes(aliceId),
  ).length;

  for (const event of events) {
    if (total >= ALICE_INTERESTS) break;
    if ((event.interestedUserIds ?? []).includes(aliceId)) continue;
    const res = await postAs(ALICE_EMAIL, `/events/${event._id}/interest`, {
      interested: true,
      source: "participate",
    });
    if (!(await warnIfFailed(`alice's interest in "${event.title}"`, res))) {
      continue;
    }
    event.interestedUserIds = [...(event.interestedUserIds ?? []), aliceId];
    total++;
  }
  return total;
}

/** `$addToSet` server-side, so re-running only adds what is genuinely missing. */
async function topUpInterest(
  events: EventRow[],
  pool: string[],
  idByEmail: Map<string, string>,
  floor: number,
  attendedOnly: boolean,
): Promise<number> {
  let added = 0;
  for (const [index, event] of events.entries()) {
    const target = Math.min(pool.length, floor + (index % INTEREST_SPREAD));
    const interested = new Set(event.interestedUserIds ?? []);
    for (
      let step = 0;
      interested.size < target && step < pool.length * 2;
      step++
    ) {
      const attendee = pool[(index * 3 + step) % pool.length];
      const attendeeId = idByEmail.get(attendee);
      if (!attendeeId || interested.has(attendeeId)) continue;
      const res = await postAs(attendee, `/events/${event._id}/interest`, {
        interested: true,
        // A past event was attended, never merely swiped.
        source: attendedOnly || step % 3 === 0 ? "participate" : "swipe",
      });
      if (!(await warnIfFailed(`interest in "${event.title}"`, res))) break;
      interested.add(attendeeId);
      added++;
    }
  }
  return added;
}

async function seedEventInterest(
  adminToken: string,
  demo: DemoNeighborhood,
  idByEmail: Map<string, string>,
): Promise<void> {
  const aliceId = idByEmail.get(ALICE_EMAIL) ?? "";
  const all = await fetchList<EventRow>(adminToken, "/events");
  const events = upcomingIn(demo, all);

  // Alice goes first so the top-up below counts her in and cannot overshoot.
  const aliceTotal = await markAliceInterest(events, aliceId);
  // She is then kept out of the pool: her own count is pinned and must not drift.
  const pool = authorsIn(demo.name).filter((email) => email !== ALICE_EMAIL);

  const added = await topUpInterest(
    events,
    pool,
    idByEmail,
    INTEREST_FLOOR,
    false,
  );
  console.log(
    `  ✓ ${events.length} upcoming event(s) topped up to ${INTEREST_FLOOR}+ interested (${added} added, alice on ${aliceTotal})`,
  );

  // Past events keep their attendance on show: the card still renders a
  // participant count, and a finished event at zero reads as empty data.
  const past = pastIn(demo, all);
  const attended = await topUpInterest(
    past,
    pool,
    idByEmail,
    PAST_INTEREST_FLOOR,
    true,
  );
  console.log(
    `  ✓ ${past.length} past event(s) topped up to ${PAST_INTEREST_FLOOR}+ attended (${attended} added)`,
  );
}

function userIdsByEmail(): Map<string, string> {
  const rows = pgQuery("SELECT email || ' ' || id FROM users");
  return new Map(
    rows
      .split("\n")
      .map((line) => line.trim().split(" "))
      .filter((columns): columns is [string, string] => columns.length === 2),
  );
}

export async function seedSocial(
  adminToken: string,
  demo: DemoNeighborhood,
): Promise<void> {
  const idByEmail = userIdsByEmail();
  await seedConversations(demo, idByEmail);
  await seedServiceResponses(adminToken, demo, idByEmail);
  await seedLikes(adminToken, demo, idByEmail);
  await seedEventInterest(adminToken, demo, idByEmail);
}
