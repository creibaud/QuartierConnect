import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { MongoClient, ObjectId } from "mongodb";
import neo4j from "neo4j-driver";
import { Pool } from "pg";
import {
    incidentComments,
    incidents,
    quartiers,
    userQuartiers,
    users,
} from "src/database/drizzle/schema";
import { CHATS_COLLECTION } from "src/database/mongodb/models/chat.model";
import { DOCUMENT_AUDIT_COLLECTION } from "src/database/mongodb/models/document-audit.model";
import { DOCUMENTS_COLLECTION } from "src/database/mongodb/models/document.model";
import {
    EVENT_REGISTRATIONS_COLLECTION,
    EVENT_SWIPES_COLLECTION,
    EVENTS_COLLECTION,
} from "src/database/mongodb/models/event.model";
import { MESSAGES_COLLECTION } from "src/database/mongodb/models/message.model";
import { QUARTIERS_GEO_COLLECTION } from "src/database/mongodb/models/quartier-geo.model";
import {
    SERVICE_RATINGS_COLLECTION,
    SERVICES_COLLECTION,
} from "src/database/mongodb/models/service.model";
import { TRANSACTIONS_COLLECTION } from "src/database/mongodb/models/transaction.model";
import {
    VOTE_RESPONSES_COLLECTION,
    VOTES_COLLECTION,
} from "src/database/mongodb/models/vote.model";

const DEMO_IDS = {
    users: {
        admin: "11111111-1111-4111-8111-111111111111",
        moderator: "22222222-2222-4222-8222-222222222222",
        alice: "33333333-3333-4333-8333-333333333333",
        bob: "44444444-4444-4444-8444-444444444444",
    },
    quartier: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    incident: "55555555-5555-4555-8555-555555555555",
    incidentComment: "66666666-6666-4666-8666-666666666666",
    mongo: {
        quartierGeo: "64aa11111111111111111111",
        event1: "64aa22222222222222222221",
        event2: "64aa22222222222222222222",
        service1: "64aa33333333333333333331",
        service2: "64aa33333333333333333332",
        transaction1: "64aa44444444444444444441",
        transaction2: "64aa44444444444444444442",
        chat1: "64aa55555555555555555551",
        message1: "64aa66666666666666666661",
        message2: "64aa66666666666666666662",
        vote1: "64aa77777777777777777771",
        voteResponse1: "64aa88888888888888888881",
        document1: "64aa99999999999999999991",
        audit1: "64aaaaaa00000000000000a1",
        audit2: "64aaaaaa00000000000000a2",
        rating1: "64aaababababababababab01",
    },
};

const VOTE_OPTION_IDS = {
    yes: "77777777-7777-4777-8777-777777777777",
    no: "88888888-8888-4888-8888-888888888888",
};

function getEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required env variable: ${name}`);
    }
    return value;
}

async function seedPostgres() {
    const pool = new Pool({
        host: getEnv("POSTGRES_HOST"),
        port: Number.parseInt(getEnv("POSTGRES_PORT"), 10),
        user: getEnv("POSTGRES_USER"),
        password: getEnv("POSTGRES_PASSWORD"),
        database: getEnv("POSTGRES_DB"),
    });

    const db = drizzle(pool);
    const now = new Date();
    const passwordHash = await bcrypt.hash("Demo1234!", 10);

    const demoUsers = [
        {
            id: DEMO_IDS.users.admin,
            email: "admin.demo@quartierconnect.local",
            firstName: "Admin",
            lastName: "Demo",
            role: "admin" as const,
            balance: "50.00",
        },
        {
            id: DEMO_IDS.users.moderator,
            email: "moderator.demo@quartierconnect.local",
            firstName: "Nora",
            lastName: "Moderateur",
            role: "moderator" as const,
            balance: "20.00",
        },
        {
            id: DEMO_IDS.users.alice,
            email: "alice.demo@quartierconnect.local",
            firstName: "Alice",
            lastName: "Martin",
            role: "resident" as const,
            balance: "12.00",
        },
        {
            id: DEMO_IDS.users.bob,
            email: "bob.demo@quartierconnect.local",
            firstName: "Bob",
            lastName: "Durand",
            role: "resident" as const,
            balance: "8.00",
        },
    ];

    for (const user of demoUsers) {
        await db
            .insert(users)
            .values({
                id: user.id,
                email: user.email,
                password: passwordHash,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                isActive: true,
                balance: user.balance,
                createdAt: now,
                updatedAt: now,
            })
            .onConflictDoUpdate({
                target: users.id,
                set: {
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    isActive: true,
                    balance: user.balance,
                    updatedAt: now,
                },
            });
    }

    await db
        .insert(quartiers)
        .values({
            id: DEMO_IDS.quartier,
            name: "Centre Demo",
            description: "Quartier central pour la presentation API",
            mongoGeoId: DEMO_IDS.mongo.quartierGeo,
            adminUserId: DEMO_IDS.users.admin,
            createdAt: now,
            updatedAt: now,
        })
        .onConflictDoUpdate({
            target: quartiers.id,
            set: {
                name: "Centre Demo",
                description: "Quartier central pour la presentation API",
                mongoGeoId: DEMO_IDS.mongo.quartierGeo,
                adminUserId: DEMO_IDS.users.admin,
                updatedAt: now,
            },
        });

    for (const userId of [
        DEMO_IDS.users.admin,
        DEMO_IDS.users.moderator,
        DEMO_IDS.users.alice,
        DEMO_IDS.users.bob,
    ]) {
        await db
            .insert(userQuartiers)
            .values({
                userId,
                quartierId: DEMO_IDS.quartier,
                addedAt: now,
            })
            .onConflictDoUpdate({
                target: userQuartiers.userId,
                set: {
                    quartierId: DEMO_IDS.quartier,
                    addedAt: now,
                },
            });
    }

    await db
        .insert(incidents)
        .values({
            id: DEMO_IDS.incident,
            creatorId: DEMO_IDS.users.alice,
            title: "Lampadaire en panne",
            description: "Le lampadaire ne fonctionne plus depuis hier soir",
            status: "open",
            priority: "medium",
            attachmentUrls: [],
            createdAt: now,
            updatedAt: now,
        })
        .onConflictDoUpdate({
            target: incidents.id,
            set: {
                creatorId: DEMO_IDS.users.alice,
                title: "Lampadaire en panne",
                description:
                    "Le lampadaire ne fonctionne plus depuis hier soir",
                status: "open",
                priority: "medium",
                updatedAt: now,
            },
        });

    await db
        .insert(incidentComments)
        .values({
            id: DEMO_IDS.incidentComment,
            incidentId: DEMO_IDS.incident,
            authorId: DEMO_IDS.users.bob,
            content: "Je confirme, il fait tres sombre dans cette rue.",
            createdAt: now,
            updatedAt: now,
        })
        .onConflictDoNothing();

    await pool.end();
}

async function seedMongo() {
    const mongoUri = `mongodb://${getEnv("MONGO_USER")}:${getEnv("MONGO_PASSWORD")}@${getEnv("MONGO_HOST")}:${getEnv("MONGO_PORT")}/${getEnv("MONGO_DB")}?authSource=admin`;
    const client = new MongoClient(mongoUri);

    await client.connect();

    const db = client.db(getEnv("MONGO_DB"));
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    await db.collection(QUARTIERS_GEO_COLLECTION).replaceOne(
        { _id: new ObjectId(DEMO_IDS.mongo.quartierGeo) },
        {
            _id: new ObjectId(DEMO_IDS.mongo.quartierGeo),
            quartierId: DEMO_IDS.quartier,
            name: "Centre Demo",
            description: "Zone geographique de demonstration",
            geojson: {
                type: "Polygon",
                coordinates: [
                    [
                        [2.352, 48.856],
                        [2.358, 48.856],
                        [2.358, 48.861],
                        [2.352, 48.861],
                        [2.352, 48.856],
                    ],
                ],
            },
            adminUserId: DEMO_IDS.users.admin,
            createdAt: now,
            updatedAt: now,
        },
        { upsert: true },
    );

    await db.collection(EVENTS_COLLECTION).replaceOne(
        { _id: new ObjectId(DEMO_IDS.mongo.event1) },
        {
            _id: new ObjectId(DEMO_IDS.mongo.event1),
            quartierId: DEMO_IDS.quartier,
            creatorId: DEMO_IDS.users.admin,
            title: "Barbecue de voisinage",
            description: "Rencontre conviviale entre residents",
            category: "social",
            startDate: nextWeek,
            registrationCount: 1,
            maxCapacity: 25,
            createdAt: now,
            updatedAt: now,
        },
        { upsert: true },
    );

    await db.collection(EVENTS_COLLECTION).replaceOne(
        { _id: new ObjectId(DEMO_IDS.mongo.event2) },
        {
            _id: new ObjectId(DEMO_IDS.mongo.event2),
            quartierId: DEMO_IDS.quartier,
            creatorId: DEMO_IDS.users.moderator,
            title: "Atelier compost",
            description: "Initiation a la reduction des dechets",
            category: "educational",
            startDate: twoWeeks,
            registrationCount: 0,
            maxCapacity: 15,
            createdAt: now,
            updatedAt: now,
        },
        { upsert: true },
    );

    await db.collection(EVENT_REGISTRATIONS_COLLECTION).replaceOne(
        {
            eventId: DEMO_IDS.mongo.event1,
            userId: DEMO_IDS.users.alice,
        },
        {
            eventId: DEMO_IDS.mongo.event1,
            userId: DEMO_IDS.users.alice,
            status: "registered",
            registeredAt: now,
        },
        { upsert: true },
    );

    await db.collection(EVENT_SWIPES_COLLECTION).replaceOne(
        {
            eventId: DEMO_IDS.mongo.event2,
            userId: DEMO_IDS.users.alice,
        },
        {
            eventId: DEMO_IDS.mongo.event2,
            userId: DEMO_IDS.users.alice,
            liked: true,
            swipedAt: now,
        },
        { upsert: true },
    );

    await db.collection(SERVICES_COLLECTION).replaceOne(
        { _id: new ObjectId(DEMO_IDS.mongo.service1) },
        {
            _id: new ObjectId(DEMO_IDS.mongo.service1),
            quartierId: DEMO_IDS.quartier,
            creatorId: DEMO_IDS.users.bob,
            acceptorId: DEMO_IDS.users.alice,
            title: "Aide bricolage etagere",
            description: "Montage d une etagere murale",
            category: "repair",
            type: "paid",
            estimatedDurationMinutes: 90,
            pointsValue: 2,
            status: "completed",
            completedAt: now,
            createdAt: now,
            updatedAt: now,
        },
        { upsert: true },
    );

    await db.collection(SERVICES_COLLECTION).replaceOne(
        { _id: new ObjectId(DEMO_IDS.mongo.service2) },
        {
            _id: new ObjectId(DEMO_IDS.mongo.service2),
            quartierId: DEMO_IDS.quartier,
            creatorId: DEMO_IDS.users.alice,
            title: "Course pharmacie",
            description: "Besoin d aide pour recuperer une ordonnance",
            category: "delivery",
            type: "free",
            estimatedDurationMinutes: 30,
            pointsValue: 1,
            status: "open",
            createdAt: now,
            updatedAt: now,
        },
        { upsert: true },
    );

    await db.collection(SERVICE_RATINGS_COLLECTION).replaceOne(
        {
            _id: new ObjectId(DEMO_IDS.mongo.rating1),
        },
        {
            _id: new ObjectId(DEMO_IDS.mongo.rating1),
            serviceId: DEMO_IDS.mongo.service1,
            raterUserId: DEMO_IDS.users.alice,
            rating: 5,
            comment: "Intervention rapide et efficace",
            createdAt: now,
        },
        { upsert: true },
    );

    await db.collection(TRANSACTIONS_COLLECTION).replaceOne(
        { _id: new ObjectId(DEMO_IDS.mongo.transaction1) },
        {
            _id: new ObjectId(DEMO_IDS.mongo.transaction1),
            fromUserId: DEMO_IDS.users.bob,
            toUserId: DEMO_IDS.users.alice,
            serviceId: DEMO_IDS.mongo.service1,
            type: "service_exchange",
            pointsAmount: 2,
            description: "Paiement service bricolage",
            createdAt: now,
        },
        { upsert: true },
    );

    await db.collection(TRANSACTIONS_COLLECTION).replaceOne(
        { _id: new ObjectId(DEMO_IDS.mongo.transaction2) },
        {
            _id: new ObjectId(DEMO_IDS.mongo.transaction2),
            fromUserId: DEMO_IDS.users.admin,
            toUserId: DEMO_IDS.users.bob,
            type: "adjustment",
            pointsAmount: 3,
            description: "Bonus moderation demo",
            createdAt: now,
        },
        { upsert: true },
    );

    await db.collection(CHATS_COLLECTION).replaceOne(
        { _id: new ObjectId(DEMO_IDS.mongo.chat1) },
        {
            _id: new ObjectId(DEMO_IDS.mongo.chat1),
            participantIds: [DEMO_IDS.users.alice, DEMO_IDS.users.bob],
            lastMessageAt: now,
            createdAt: now,
            updatedAt: now,
        },
        { upsert: true },
    );

    await db.collection(MESSAGES_COLLECTION).replaceOne(
        { _id: new ObjectId(DEMO_IDS.mongo.message1) },
        {
            _id: new ObjectId(DEMO_IDS.mongo.message1),
            chatId: DEMO_IDS.mongo.chat1,
            authorUserId: DEMO_IDS.users.alice,
            content: "Bonjour Bob, dispo pour le bricolage cet apres-midi ?",
            attachments: [],
            createdAt: now,
            updatedAt: now,
        },
        { upsert: true },
    );

    await db.collection(MESSAGES_COLLECTION).replaceOne(
        { _id: new ObjectId(DEMO_IDS.mongo.message2) },
        {
            _id: new ObjectId(DEMO_IDS.mongo.message2),
            chatId: DEMO_IDS.mongo.chat1,
            authorUserId: DEMO_IDS.users.bob,
            content: "Oui, parfait pour 15h.",
            attachments: [],
            createdAt: now,
            updatedAt: now,
        },
        { upsert: true },
    );

    await db.collection(VOTES_COLLECTION).replaceOne(
        { _id: new ObjectId(DEMO_IDS.mongo.vote1) },
        {
            _id: new ObjectId(DEMO_IDS.mongo.vote1),
            quartierId: DEMO_IDS.quartier,
            creatorId: DEMO_IDS.users.moderator,
            title: "Installer un compost collectif ?",
            description: "Vote test pour la demonstration",
            type: "binary",
            options: [
                { id: VOTE_OPTION_IDS.yes, label: "yes", votesCount: 1 },
                { id: VOTE_OPTION_IDS.no, label: "no", votesCount: 0 },
            ],
            durationMinutes: 10080,
            isAnonymous: false,
            showResults: true,
            startedAt: now,
            endsAt: twoWeeks,
            createdAt: now,
        },
        { upsert: true },
    );

    await db.collection(VOTE_RESPONSES_COLLECTION).replaceOne(
        { _id: new ObjectId(DEMO_IDS.mongo.voteResponse1) },
        {
            _id: new ObjectId(DEMO_IDS.mongo.voteResponse1),
            voteId: DEMO_IDS.mongo.vote1,
            userId: DEMO_IDS.users.alice,
            selectedOptions: [VOTE_OPTION_IDS.yes],
            respondedAt: now,
        },
        { upsert: true },
    );

    await db.collection(DOCUMENTS_COLLECTION).replaceOne(
        { _id: new ObjectId(DEMO_IDS.mongo.document1) },
        {
            _id: new ObjectId(DEMO_IDS.mongo.document1),
            creatorId: DEMO_IDS.users.alice,
            title: "Accord entraide voisinage",
            description: "Document de test signature",
            documentType: "contract",
            status: "pending_signature",
            signatures: [
                {
                    signerId: DEMO_IDS.users.bob,
                    status: "pending",
                    x: 120,
                    y: 340,
                    page: 1,
                },
            ],
            sharedWith: [DEMO_IDS.users.bob],
            createdAt: now,
            updatedAt: now,
        },
        { upsert: true },
    );

    await db.collection(DOCUMENT_AUDIT_COLLECTION).replaceOne(
        { _id: new ObjectId(DEMO_IDS.mongo.audit1) },
        {
            _id: new ObjectId(DEMO_IDS.mongo.audit1),
            documentId: DEMO_IDS.mongo.document1,
            actionType: "import",
            performedByUserId: DEMO_IDS.users.alice,
            createdAt: now,
        },
        { upsert: true },
    );

    await db.collection(DOCUMENT_AUDIT_COLLECTION).replaceOne(
        { _id: new ObjectId(DEMO_IDS.mongo.audit2) },
        {
            _id: new ObjectId(DEMO_IDS.mongo.audit2),
            documentId: DEMO_IDS.mongo.document1,
            actionType: "share",
            performedByUserId: DEMO_IDS.users.alice,
            createdAt: now,
        },
        { upsert: true },
    );

    await client.close();
}

async function seedNeo4j() {
    const driver = neo4j.driver(
        `bolt://${getEnv("NEO4J_HOST")}:${getEnv("NEO4J_PORT")}`,
        neo4j.auth.basic(getEnv("NEO4J_USER"), getEnv("NEO4J_PASSWORD")),
    );

    const session = driver.session();
    const nowIso = new Date().toISOString();

    try {
        await session.run(
            "CREATE CONSTRAINT user_id_unique IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE",
        );
        await session.run(
            "CREATE CONSTRAINT event_id_unique IF NOT EXISTS FOR (e:Event) REQUIRE e.id IS UNIQUE",
        );
        await session.run(
            "CREATE CONSTRAINT service_id_unique IF NOT EXISTS FOR (s:Service) REQUIRE s.id IS UNIQUE",
        );

        await session.run(
            `
            MATCH (n)
            WHERE n.id IN $ids
            DETACH DELETE n
            `,
            {
                ids: [
                    DEMO_IDS.users.admin,
                    DEMO_IDS.users.moderator,
                    DEMO_IDS.users.alice,
                    DEMO_IDS.users.bob,
                    DEMO_IDS.quartier,
                    DEMO_IDS.mongo.event1,
                    DEMO_IDS.mongo.event2,
                    DEMO_IDS.mongo.service1,
                    DEMO_IDS.mongo.service2,
                    "social",
                    "educational",
                    "repair",
                    "delivery",
                ],
            },
        );

        await session.run(
            `
            MERGE (u1:User {id: $adminId})
            SET u1.email = 'admin.demo@quartierconnect.local', u1.firstName = 'Admin', u1.lastName = 'Demo', u1.role = 'admin', u1.isActive = true, u1.createdAt = $date
            MERGE (u2:User {id: $moderatorId})
            SET u2.email = 'moderator.demo@quartierconnect.local', u2.firstName = 'Nora', u2.lastName = 'Moderateur', u2.role = 'moderator', u2.isActive = true, u2.createdAt = $date
            MERGE (u3:User {id: $aliceId})
            SET u3.email = 'alice.demo@quartierconnect.local', u3.firstName = 'Alice', u3.lastName = 'Martin', u3.role = 'resident', u3.isActive = true, u3.createdAt = $date
            MERGE (u4:User {id: $bobId})
            SET u4.email = 'bob.demo@quartierconnect.local', u4.firstName = 'Bob', u4.lastName = 'Durand', u4.role = 'resident', u4.isActive = true, u4.createdAt = $date
            MERGE (q:Quartier {id: $quartierId})
            SET q.name = 'Centre Demo'
            MERGE (e1:Event {id: $event1Id})
            SET e1.title = 'Barbecue de voisinage', e1.category = 'social', e1.startDate = $date, e1.createdAt = $date
            MERGE (e2:Event {id: $event2Id})
            SET e2.title = 'Atelier compost', e2.category = 'educational', e2.startDate = $date, e2.createdAt = $date
            MERGE (s1:Service {id: $service1Id})
            SET s1.title = 'Aide bricolage etagere', s1.category = 'repair', s1.status = 'completed', s1.createdAt = $date
            MERGE (s2:Service {id: $service2Id})
            SET s2.title = 'Course pharmacie', s2.category = 'delivery', s2.status = 'open', s2.createdAt = $date
            MERGE (cSocial:Category {id: 'social'})
            SET cSocial.name = 'social'
            MERGE (cEdu:Category {id: 'educational'})
            SET cEdu.name = 'educational'
            MERGE (u1)-[:LIVES_IN {since: $date}]->(q)
            MERGE (u2)-[:LIVES_IN {since: $date}]->(q)
            MERGE (u3)-[:LIVES_IN {since: $date}]->(q)
            MERGE (u4)-[:LIVES_IN {since: $date}]->(q)
            MERGE (u1)-[:CREATED_EVENT]->(e1)
            MERGE (u2)-[:CREATED_EVENT]->(e2)
            MERGE (e1)-[:IN_CATEGORY]->(cSocial)
            MERGE (e2)-[:IN_CATEGORY]->(cEdu)
            MERGE (u3)-[:PARTICIPATED_IN {registeredAt: $date}]->(e1)
            MERGE (u3)-[:INTERESTED_IN_CATEGORY {score: 2, updatedAt: $date}]->(cSocial)
            MERGE (u4)-[:CREATED_SERVICE]->(s1)
            MERGE (u3)-[:CREATED_SERVICE]->(s2)
            MERGE (u4)-[:COMPLETED_SERVICE_WITH {serviceId: $service1Id, points: 2, completedAt: $date}]->(u3)
            MERGE (u4)-[:KNOWS {weight: 2, since: $date}]->(u3)
            MERGE (u1)-[:KNOWS {weight: 1, since: $date}]->(u3)
            `,
            {
                adminId: DEMO_IDS.users.admin,
                moderatorId: DEMO_IDS.users.moderator,
                aliceId: DEMO_IDS.users.alice,
                bobId: DEMO_IDS.users.bob,
                quartierId: DEMO_IDS.quartier,
                event1Id: DEMO_IDS.mongo.event1,
                event2Id: DEMO_IDS.mongo.event2,
                service1Id: DEMO_IDS.mongo.service1,
                service2Id: DEMO_IDS.mongo.service2,
                date: nowIso,
            },
        );
    } finally {
        await session.close();
        await driver.close();
    }
}

async function verifyPostgres() {
    const pool = new Pool({
        host: getEnv("POSTGRES_HOST"),
        port: Number.parseInt(getEnv("POSTGRES_PORT"), 10),
        user: getEnv("POSTGRES_USER"),
        password: getEnv("POSTGRES_PASSWORD"),
        database: getEnv("POSTGRES_DB"),
    });

    const db = drizzle(pool);

    const [admin] = await db
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(eq(users.id, DEMO_IDS.users.admin))
        .limit(1);

    if (!admin) {
        throw new Error("PostgreSQL seed verification failed");
    }

    await pool.end();
}

async function main() {
    console.log(
        "[seed-demo] Start demo seeding for PostgreSQL, MongoDB, Neo4j...",
    );

    await seedPostgres();
    console.log("[seed-demo] PostgreSQL seeded");

    await seedMongo();
    console.log("[seed-demo] MongoDB seeded");

    await seedNeo4j();
    console.log("[seed-demo] Neo4j seeded");

    await verifyPostgres();
    console.log("[seed-demo] Verification completed");
    console.log("[seed-demo] Done");
}

void main().catch((error: unknown) => {
    console.error("[seed-demo] Failed", error);
    process.exit(1);
});
