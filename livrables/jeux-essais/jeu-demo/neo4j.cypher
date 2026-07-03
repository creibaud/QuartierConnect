// Jeu de démonstration QuartierConnect — graphe Neo4j
// Instructions MERGE idempotentes : rejouable sans doublon.

// ── Nœuds ──
MERGE (n:`Event` {id: "6a44346ed6ad48111c1abca9"}) SET n.`createdAt` = datetime("2026-06-30T21:26:06.306000000Z"), n.`createdBy` = "41d91ab9-b9a9-45ed-a5b8-9c2ae4819316", n.`date` = datetime("2026-07-06T21:26:06.219000000Z"), n.`name` = "Vide-grenier du quartier", n.`updatedAt` = datetime("2026-07-02T23:39:32.643000000Z");
MERGE (n:`Event` {id: "6a44346ed6ad48111c1abcaa"}) SET n.`createdAt` = datetime("2026-06-30T21:26:06.322000000Z"), n.`createdBy` = "41d91ab9-b9a9-45ed-a5b8-9c2ae4819316", n.`date` = datetime("2026-07-12T21:26:06.220000000Z"), n.`name` = "Concert en plein air", n.`updatedAt` = datetime("2026-07-02T23:39:32.676000000Z");
MERGE (n:`Event` {id: "6a44346ed6ad48111c1abcab"}) SET n.`createdAt` = datetime("2026-06-30T21:26:06.332000000Z"), n.`createdBy` = "41d91ab9-b9a9-45ed-a5b8-9c2ae4819316", n.`date` = datetime("2026-07-20T21:26:06.220000000Z"), n.`name` = "Tournoi de pétanque", n.`updatedAt` = datetime("2026-07-02T23:39:32.683000000Z");
MERGE (n:`Event` {id: "6a46f5c2cc59f9b84636dfc0"}) SET n.`createdAt` = datetime("2026-07-02T23:35:30.280000000Z"), n.`createdBy` = "ea7894ed-97f8-45ef-b955-35cd773830e5", n.`date` = datetime("2026-07-07T23:35:30.270000000Z"), n.`name` = "Atelier réparation vélo", n.`updatedAt` = datetime("2026-07-02T23:39:32.690000000Z");
MERGE (n:`Neighborhood` {id: "6a42833f5980b9e26ff1a71c"}) SET n.`name` = "10ème Ardt", n.`updatedAt` = datetime("2026-07-02T23:39:32.454000000Z");
MERGE (n:`Neighborhood` {id: "6a42833f5980b9e26ff1a71d"}) SET n.`name` = "18ème Ardt", n.`updatedAt` = datetime("2026-07-02T23:39:32.476000000Z");
MERGE (n:`Neighborhood` {id: "6a42833f5980b9e26ff1a71e"}) SET n.`name` = "9ème Ardt", n.`updatedAt` = datetime("2026-07-02T23:39:32.483000000Z");
MERGE (n:`Neighborhood` {id: "6a42833f5980b9e26ff1a71f"}) SET n.`name` = "11ème Ardt", n.`updatedAt` = datetime("2026-07-02T23:39:32.490000000Z");
MERGE (n:`Neighborhood` {id: "6a42833f5980b9e26ff1a720"}) SET n.`name` = "14ème Ardt", n.`updatedAt` = datetime("2026-07-02T23:39:32.497000000Z");
MERGE (n:`Neighborhood` {id: "6a42833f5980b9e26ff1a721"}) SET n.`name` = "4ème Ardt", n.`updatedAt` = datetime("2026-07-02T23:39:32.503000000Z");
MERGE (n:`Neighborhood` {id: "6a42833f5980b9e26ff1a722"}) SET n.`name` = "5ème Ardt", n.`updatedAt` = datetime("2026-07-02T23:39:32.510000000Z");
MERGE (n:`Neighborhood` {id: "6a42833f5980b9e26ff1a723"}) SET n.`name` = "2ème Ardt", n.`updatedAt` = datetime("2026-07-02T23:39:32.515000000Z");
MERGE (n:`Neighborhood` {id: "6a42833f5980b9e26ff1a724"}) SET n.`name` = "8ème Ardt", n.`updatedAt` = datetime("2026-07-02T23:39:32.520000000Z");
MERGE (n:`Neighborhood` {id: "6a4283405980b9e26ff1a725"}) SET n.`name` = "20ème Ardt", n.`updatedAt` = datetime("2026-07-02T23:39:32.525000000Z");
MERGE (n:`Neighborhood` {id: "6a4283405980b9e26ff1a726"}) SET n.`name` = "6ème Ardt", n.`updatedAt` = datetime("2026-07-02T23:39:32.530000000Z");
MERGE (n:`Neighborhood` {id: "6a4283405980b9e26ff1a727"}) SET n.`name` = "15ème Ardt", n.`updatedAt` = datetime("2026-07-02T23:39:32.534000000Z");
MERGE (n:`Neighborhood` {id: "6a4283405980b9e26ff1a728"}) SET n.`name` = "17ème Ardt", n.`updatedAt` = datetime("2026-07-02T23:39:32.539000000Z");
MERGE (n:`Neighborhood` {id: "6a4283405980b9e26ff1a729"}) SET n.`name` = "12ème Ardt", n.`updatedAt` = datetime("2026-07-02T23:39:32.544000000Z");
MERGE (n:`Neighborhood` {id: "6a4283405980b9e26ff1a72a"}) SET n.`name` = "16ème Ardt", n.`updatedAt` = datetime("2026-07-02T23:39:32.549000000Z");
MERGE (n:`Neighborhood` {id: "6a4283405980b9e26ff1a72b"}) SET n.`name` = "19ème Ardt", n.`updatedAt` = datetime("2026-07-02T23:39:32.553000000Z");
MERGE (n:`Neighborhood` {id: "6a4283405980b9e26ff1a72c"}) SET n.`name` = "13ème Ardt", n.`updatedAt` = datetime("2026-07-02T23:39:32.558000000Z");
MERGE (n:`Neighborhood` {id: "6a4283405980b9e26ff1a72d"}) SET n.`name` = "7ème Ardt", n.`updatedAt` = datetime("2026-07-02T23:39:32.562000000Z");
MERGE (n:`Neighborhood` {id: "6a4283405980b9e26ff1a72e"}) SET n.`name` = "1er Ardt", n.`updatedAt` = datetime("2026-07-02T23:39:32.567000000Z");
MERGE (n:`Neighborhood` {id: "6a4283405980b9e26ff1a72f"}) SET n.`name` = "3ème Ardt", n.`updatedAt` = datetime("2026-07-02T23:39:32.571000000Z");
MERGE (n:`Service` {id: "6a44346ed6ad48111c1abcac"}) SET n.`category` = "gardening", n.`createdAt` = datetime("2026-06-30T21:26:06.354000000Z"), n.`createdBy` = "41d91ab9-b9a9-45ed-a5b8-9c2ae4819316", n.`name` = "Aide au jardinage le week-end", n.`updatedAt` = datetime("2026-07-02T23:39:32.579000000Z");
MERGE (n:`Service` {id: "6a44346ed6ad48111c1abcad"}) SET n.`category` = "other", n.`createdAt` = datetime("2026-06-30T21:26:06.369000000Z"), n.`createdBy` = "41d91ab9-b9a9-45ed-a5b8-9c2ae4819316", n.`name` = "Cours de soutien scolaire", n.`updatedAt` = datetime("2026-07-02T23:39:32.587000000Z");
MERGE (n:`Service` {id: "6a44346ed6ad48111c1abcae"}) SET n.`category` = "childcare", n.`createdAt` = datetime("2026-06-30T21:26:06.378000000Z"), n.`createdBy` = "41d91ab9-b9a9-45ed-a5b8-9c2ae4819316", n.`name` = "Garde d'animaux", n.`updatedAt` = datetime("2026-07-02T23:39:32.596000000Z");
MERGE (n:`Service` {id: "6a44346ed6ad48111c1abcaf"}) SET n.`category` = "transport", n.`createdAt` = datetime("2026-06-30T21:26:06.388000000Z"), n.`createdBy` = "41d91ab9-b9a9-45ed-a5b8-9c2ae4819316", n.`name` = "Recherche covoiturage pour le marché", n.`updatedAt` = datetime("2026-07-02T23:39:32.604000000Z");
MERGE (n:`Service` {id: "6a44346ed6ad48111c1abcb0"}) SET n.`category` = "handyman", n.`createdAt` = datetime("2026-06-30T21:26:06.395000000Z"), n.`createdBy` = "41d91ab9-b9a9-45ed-a5b8-9c2ae4819316", n.`name` = "Cherche aide pour petit déménagement", n.`updatedAt` = datetime("2026-07-02T23:39:32.612000000Z");
MERGE (n:`Service` {id: "6a46c6c0f0d7122d4dc9c973"}) SET n.`category` = "handyman", n.`createdAt` = datetime("2026-07-02T20:14:56.124000000Z"), n.`createdBy` = "f3dad978-6792-4d0c-b2a5-fe3f3f08253f", n.`name` = "Réparation de vélo par Alice", n.`updatedAt` = datetime("2026-07-02T23:39:32.626000000Z");
MERGE (n:`Service` {id: "6a46f580cc59f9b84636dfb7"}) SET n.`category` = "handyman", n.`createdAt` = datetime("2026-07-02T23:34:24.347000000Z"), n.`createdBy` = "ea7894ed-97f8-45ef-b955-35cd773830e5", n.`name` = "Coup de main bricolage par Bob", n.`updatedAt` = datetime("2026-07-02T23:39:32.634000000Z");
MERGE (n:`User` {id: "41d91ab9-b9a9-45ed-a5b8-9c2ae4819316"}) SET n.`createdAt` = datetime("2026-07-02T22:28:22.373000000Z"), n.`name` = "Admin QuartierConnect", n.`updatedAt` = datetime("2026-07-02T23:39:32.775000000Z");
MERGE (n:`User` {id: "ea7894ed-97f8-45ef-b955-35cd773830e5"}) SET n.`createdAt` = datetime("2026-07-02T10:36:09.249000000Z"), n.`name` = "Bob Dupont", n.`updatedAt` = datetime("2026-07-02T23:39:32.766000000Z");
MERGE (n:`User` {id: "f3dad978-6792-4d0c-b2a5-fe3f3f08253f"}) SET n.`name` = "Alice Martin", n.`updatedAt` = datetime("2026-07-02T23:39:32.758000000Z");

// ── Relations ──
MATCH (a:`Event` {id: "6a44346ed6ad48111c1abca9"}), (b:`Neighborhood` {id: "6a42833f5980b9e26ff1a71c"}) MERGE (a)-[:`HELD_IN`]->(b);
MATCH (a:`Event` {id: "6a44346ed6ad48111c1abcaa"}), (b:`Neighborhood` {id: "6a42833f5980b9e26ff1a71c"}) MERGE (a)-[:`HELD_IN`]->(b);
MATCH (a:`Event` {id: "6a44346ed6ad48111c1abcab"}), (b:`Neighborhood` {id: "6a42833f5980b9e26ff1a71c"}) MERGE (a)-[:`HELD_IN`]->(b);
MATCH (a:`Event` {id: "6a46f5c2cc59f9b84636dfc0"}), (b:`Neighborhood` {id: "6a42833f5980b9e26ff1a71c"}) MERGE (a)-[:`HELD_IN`]->(b);
MATCH (a:`User` {id: "ea7894ed-97f8-45ef-b955-35cd773830e5"}), (b:`User` {id: "f3dad978-6792-4d0c-b2a5-fe3f3f08253f"}) MERGE (a)-[:`HELPED` {`points`: 2.0, `serviceId`: "6a46c6c0f0d7122d4dc9c973", `timestamp`: datetime("2026-07-02T23:33:53.870000000Z")}]->(b);
MATCH (a:`User` {id: "f3dad978-6792-4d0c-b2a5-fe3f3f08253f"}), (b:`User` {id: "ea7894ed-97f8-45ef-b955-35cd773830e5"}) MERGE (a)-[:`HELPED` {`points`: 2.0, `serviceId`: "6a46f580cc59f9b84636dfb7", `timestamp`: datetime("2026-07-02T23:35:30.251000000Z")}]->(b);
MATCH (a:`User` {id: "41d91ab9-b9a9-45ed-a5b8-9c2ae4819316"}), (b:`Event` {id: "6a44346ed6ad48111c1abca9"}) MERGE (a)-[:`INTERESTED_IN` {`timestamp`: datetime("2026-07-02T22:28:22.415000000Z")}]->(b);
MATCH (a:`User` {id: "41d91ab9-b9a9-45ed-a5b8-9c2ae4819316"}), (b:`Event` {id: "6a44346ed6ad48111c1abcaa"}) MERGE (a)-[:`INTERESTED_IN` {`timestamp`: datetime("2026-07-02T22:28:22.421000000Z")}]->(b);
MATCH (a:`User` {id: "41d91ab9-b9a9-45ed-a5b8-9c2ae4819316"}), (b:`Event` {id: "6a44346ed6ad48111c1abcab"}) MERGE (a)-[:`INTERESTED_IN` {`timestamp`: datetime("2026-07-02T22:28:22.428000000Z")}]->(b);
MATCH (a:`User` {id: "ea7894ed-97f8-45ef-b955-35cd773830e5"}), (b:`Event` {id: "6a44346ed6ad48111c1abca9"}) MERGE (a)-[:`INTERESTED_IN` {`timestamp`: datetime("2026-07-02T10:36:09.306000000Z")}]->(b);
MATCH (a:`User` {id: "ea7894ed-97f8-45ef-b955-35cd773830e5"}), (b:`Event` {id: "6a44346ed6ad48111c1abcaa"}) MERGE (a)-[:`INTERESTED_IN` {`timestamp`: datetime("2026-07-02T10:36:09.315000000Z")}]->(b);
MATCH (a:`User` {id: "ea7894ed-97f8-45ef-b955-35cd773830e5"}), (b:`Event` {id: "6a44346ed6ad48111c1abcab"}) MERGE (a)-[:`INTERESTED_IN` {`timestamp`: datetime("2026-07-02T10:36:09.323000000Z")}]->(b);
MATCH (a:`User` {id: "ea7894ed-97f8-45ef-b955-35cd773830e5"}), (b:`Event` {id: "6a46f5c2cc59f9b84636dfc0"}) MERGE (a)-[:`INTERESTED_IN` {`timestamp`: datetime("2026-07-02T23:35:30.344000000Z")}]->(b);
MATCH (a:`User` {id: "f3dad978-6792-4d0c-b2a5-fe3f3f08253f"}), (b:`Event` {id: "6a44346ed6ad48111c1abca9"}) MERGE (a)-[:`INTERESTED_IN` {`timestamp`: datetime("2026-07-02T08:08:34.372000000Z")}]->(b);
MATCH (a:`User` {id: "f3dad978-6792-4d0c-b2a5-fe3f3f08253f"}), (b:`Event` {id: "6a44346ed6ad48111c1abcaa"}) MERGE (a)-[:`INTERESTED_IN` {`timestamp`: datetime("2026-07-02T23:32:18.841000000Z")}]->(b);
MATCH (a:`User` {id: "f3dad978-6792-4d0c-b2a5-fe3f3f08253f"}), (b:`Event` {id: "6a44346ed6ad48111c1abcab"}) MERGE (a)-[:`INTERESTED_IN` {`timestamp`: datetime("2026-07-02T10:36:09.298000000Z")}]->(b);
MATCH (a:`User` {id: "41d91ab9-b9a9-45ed-a5b8-9c2ae4819316"}), (b:`Neighborhood` {id: "6a4283405980b9e26ff1a729"}) MERGE (a)-[:`LIVES_IN`]->(b);
MATCH (a:`User` {id: "ea7894ed-97f8-45ef-b955-35cd773830e5"}), (b:`Neighborhood` {id: "6a42833f5980b9e26ff1a71c"}) MERGE (a)-[:`LIVES_IN`]->(b);
MATCH (a:`User` {id: "f3dad978-6792-4d0c-b2a5-fe3f3f08253f"}), (b:`Neighborhood` {id: "6a42833f5980b9e26ff1a71c"}) MERGE (a)-[:`LIVES_IN`]->(b);
MATCH (a:`Service` {id: "6a44346ed6ad48111c1abcac"}), (b:`Neighborhood` {id: "6a42833f5980b9e26ff1a71c"}) MERGE (a)-[:`LOCATED_IN`]->(b);
MATCH (a:`Service` {id: "6a44346ed6ad48111c1abcad"}), (b:`Neighborhood` {id: "6a42833f5980b9e26ff1a71c"}) MERGE (a)-[:`LOCATED_IN`]->(b);
MATCH (a:`Service` {id: "6a44346ed6ad48111c1abcae"}), (b:`Neighborhood` {id: "6a42833f5980b9e26ff1a71c"}) MERGE (a)-[:`LOCATED_IN`]->(b);
MATCH (a:`Service` {id: "6a44346ed6ad48111c1abcaf"}), (b:`Neighborhood` {id: "6a42833f5980b9e26ff1a71c"}) MERGE (a)-[:`LOCATED_IN`]->(b);
MATCH (a:`Service` {id: "6a44346ed6ad48111c1abcb0"}), (b:`Neighborhood` {id: "6a42833f5980b9e26ff1a71c"}) MERGE (a)-[:`LOCATED_IN`]->(b);
MATCH (a:`Service` {id: "6a46c6c0f0d7122d4dc9c973"}), (b:`Neighborhood` {id: "6a42833f5980b9e26ff1a71c"}) MERGE (a)-[:`LOCATED_IN`]->(b);
MATCH (a:`Service` {id: "6a46f580cc59f9b84636dfb7"}), (b:`Neighborhood` {id: "6a42833f5980b9e26ff1a71c"}) MERGE (a)-[:`LOCATED_IN`]->(b);
