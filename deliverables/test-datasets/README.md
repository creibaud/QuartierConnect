# Test datasets

Two text-format datasets, importable into the application's three databases
(PostgreSQL, MongoDB, Neo4j) through a single script:

| Dataset | Contents |
|---------|----------|
| `demo-dataset/` | Full demo state: accounts with TOTP, 20 neighborhoods (Paris arrondissements), mutual-aid services, events, votes, signed contracts (PDF included), messaging, incidents, points, Neo4j social graph. |
| `empty-dataset/` | No data: resets the three databases to start from a blank application. |

Text files only, all readable (SQL, JSON, Cypher).

## Prerequisites

1. The development Docker stack is running:

   ```bash
   make dev
   ```

2. The API has started at least once: it applies the PostgreSQL migrations at
   boot and creates the schema. The import script checks this and refuses to
   continue if no table exists.

## Import

From the repository root:

```bash
./deliverables/test-datasets/import-dataset.sh demo-dataset   # demo dataset
./deliverables/test-datasets/import-dataset.sh empty-dataset   # empty databases
```

The import is destructive: the script asks for confirmation (type `yes`)
before purging. Add `--yes` (or `IMPORT_DATASET_YES=1`) for scripted use. It
also refuses to run if the environment looks like production —
`NODE_ENV=production` or `PROD_DOMAIN` in `.env`, `CORS_ORIGINS` over https,
repository inside a deployment path — because the Docker Compose project has
the same name in dev and in prod. To override knowingly:
`IMPORT_DATASET_ALLOW_PROD=1`.

`demo-dataset` can be re-imported as often as you like. `empty-dataset` cannot:
it leaves PostgreSQL with no schema until the API restarts and replays its
migrations. Either way the script proceeds in the same order:

1. **Purge** of the three databases: `DROP SCHEMA public CASCADE` then
   recreation on the PostgreSQL side (the dump recreates the tables),
   `deleteMany` on each MongoDB collection, `MATCH (n) DETACH DELETE n` on the
   Neo4j side.
2. **Import** of the chosen dataset: `psql` (single transaction),
   `mongoimport --drop` collection by collection, `cypher-shell`.
3. **Summary**: final counts in each database, then a reminder of the demo
   accounts.

After the import, restart the API to recreate the MongoDB indexes and clear
the caches:

```bash
docker compose -f docker/docker-compose.yml --env-file .env restart api
```

Database credentials are read from the `.env` at the repository root, as for
the other scripts in the project.

## Demo accounts (demo-dataset)

| Email | Password | Role | TOTP |
|-------|----------|------|------|
| `alice@demo.fr` | `Demo1234!` | Resident | secret `4PX635D55YS6JJV3NYIXKZPREIO6YIIV` |
| `bob@demo.fr` | `Demo1234!` | Moderator | secret `4PX635D55YS6JJV3NYIXKZPREIO6YIIV` |
| `admin@demo.fr` | `Demo1234!` | Administrator | secret `4PX635D55YS6JJV3NYIXKZPREIO6YIIV` |

The 6-digit TOTP code is generated from the secret, for example:

```bash
oathtool -b --totp 4PX635D55YS6JJV3NYIXKZPREIO6YIIV
```

## What `demo-dataset/` contains

### `postgres.sql`

A `pg_dump` in the default format: schema definitions followed by the data as
`COPY … FROM stdin` blocks. It covers the `drizzle` migration table and the
`public` tables — users, incidents, points balances, points transactions and
revoked tokens.

Because the purge drops the schema before importing, the dump is what
recreates the tables. It stays in step with the Drizzle migrations in
`api/drizzle/`, which the API applies at every start.

### `mongo/`

One JSON file per collection (`mongoexport --jsonArray --pretty`, Extended
JSON format): the application collections (users, conversations, messages,
services, events, contracts, bookings, responses, votes, documents,
neighborhoods, SSO tokens) plus the GridFS pairs `pdfs.*`, `avatars.*` and
`messaging_files.*` (`.files` + `.chunks`).

Binary files (contract PDFs, avatars, attachments) are included in the GridFS
chunks, base64-encoded: the dataset stays a text file while restoring the
documents byte for byte. Empty collections hold `[]` and are skipped on
import.

### `neo4j.cypher`

The social graph — `User`, `Neighborhood`, `Service` and `Event` nodes, and
`LIVES_IN`, `LOCATED_IN`, `HELD_IN`, `INTERESTED_IN`, `ATTENDING` and
`HELPED` relationships — expressed as idempotent `MERGE` statements: replaying
the file against an already-populated database creates no duplicate.
Properties (dates, points, identifiers cross-referenced with PostgreSQL and
MongoDB) are preserved.
