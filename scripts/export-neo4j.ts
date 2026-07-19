// Dump the Neo4j graph as idempotent MERGE statements on stdout.
// Called by export-dataset.sh; run through the api workspace so neo4j-driver resolves.
import neo4j, { Driver, Integer } from "neo4j-driver";

const URI = process.env.NEO4J_URI ?? "bolt://localhost:7687";
const USER = process.env.NEO4J_USER ?? "neo4j";
const PASSWORD = process.env.NEO4J_PASSWORD ?? "";

/** Neo4j temporal types expose their ISO form through toString(). */
function isTemporal(value: unknown): boolean {
  const name = (value as { constructor?: { name?: string } })?.constructor?.name;
  return (
    name === "DateTime" ||
    name === "Date" ||
    name === "LocalDateTime" ||
    name === "Duration"
  );
}

function literal(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (neo4j.isInt(value)) return (value as Integer).toString();
  if (isTemporal(value)) return `datetime(${JSON.stringify(String(value))})`;
  if (Array.isArray(value)) return `[${value.map(literal).join(", ")}]`;
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  return JSON.stringify(String(value));
}

/** Everything but the id, which is already pinned by the MERGE pattern. */
function properties(props: Record<string, unknown>, skipId: boolean): string {
  return Object.entries(props)
    .filter(([key]) => !(skipId && key === "id"))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `\`${key}\`: ${literal(value)}`)
    .join(", ");
}

async function exportNodes(driver: Driver): Promise<string[]> {
  const session = driver.session();
  try {
    const result = await session.run(
      "MATCH (n) RETURN labels(n)[0] AS label, properties(n) AS props ORDER BY label, props.id",
    );
    return result.records.map((record) => {
      const label = record.get("label") as string;
      const props = record.get("props") as Record<string, unknown>;
      const assignments = Object.entries(props)
        .filter(([key]) => key !== "id")
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `n.\`${key}\` = ${literal(value)}`)
        .join(", ");
      const merge = `MERGE (n:\`${label}\` {id: ${literal(props.id)}})`;
      return assignments ? `${merge} SET ${assignments};` : `${merge};`;
    });
  } finally {
    await session.close();
  }
}

async function exportRelations(driver: Driver): Promise<string[]> {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (a)-[r]->(b)
       RETURN labels(a)[0] AS from, a.id AS fromId, type(r) AS rel,
              properties(r) AS props, labels(b)[0] AS to, b.id AS toId
       ORDER BY rel, fromId, toId`,
    );
    return result.records.map((record) => {
      const props = properties(record.get("props") as Record<string, unknown>, false);
      const body = props ? ` {${props}}` : "";
      return (
        `MATCH (a:\`${record.get("from")}\` {id: ${literal(record.get("fromId"))}}), ` +
        `(b:\`${record.get("to")}\` {id: ${literal(record.get("toId"))}}) ` +
        `MERGE (a)-[:\`${record.get("rel")}\`${body}]->(b);`
      );
    });
  } finally {
    await session.close();
  }
}

async function main(): Promise<void> {
  const driver = neo4j.driver(URI, neo4j.auth.basic(USER, PASSWORD));
  try {
    const nodes = await exportNodes(driver);
    const relations = await exportRelations(driver);
    console.log("// QuartierConnect demo dataset — Neo4j graph");
    console.log("// Idempotent MERGE statements: replaying creates no duplicate.");
    console.log("");
    console.log("// ── Nodes ──");
    for (const line of nodes) console.log(line);
    console.log("");
    console.log("// ── Relationships ──");
    for (const line of relations) console.log(line);
  } finally {
    await driver.close();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
