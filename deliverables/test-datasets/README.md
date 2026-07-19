# Test datasets

Two text-format datasets, importable into the application's three databases
(PostgreSQL, MongoDB, Neo4j) through a single script:

| Dataset | Contents |
|---------|----------|
| `demo-dataset/` | Full demo state: 72 accounts with TOTP, 15 Paris neighborhoods, mutual-aid services, events, community votes, signed contracts (PDF included), messaging, incidents, points, Neo4j social graph. |
| `empty-dataset/` | No data: resets the three databases to start from a blank application. |

About 780 KB, text files only, all readable (SQL, JSON, Cypher).

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

A `pg_dump` in the default format: 6 `CREATE TABLE` statements followed by the
data as `COPY … FROM stdin` blocks, 639 lines in all.

| Table | Rows |
|-------|------|
| `public.users` | 72 |
| `public.incidents` | 58 |
| `public.points_transactions` | 84 |
| `public.points_balances` | 66 |
| `public.revoked_tokens` | 0 |
| `drizzle.__drizzle_migrations` | 10 |

Because the purge drops the schema before importing, the dump is what
recreates the tables. It stays in step with the Drizzle migrations in
`api/drizzle/`, which the API applies at every start.

The 72 accounts break down into 60 residents, 4 moderators, 2 administrators,
4 banned and 2 deleted, so every role a screen can filter on returns results.
15 of them carry an address that no neighborhood polygon covers, which is what
the admin "uncovered addresses" screen lists.

### `mongo/`

One JSON file per collection (`mongoexport --jsonArray --pretty`, Extended
JSON format), 19 files:

| Collection | Documents | | Collection | Documents |
|------------|-----------|---|------------|-----------|
| `services` | 55 | | `messages` | 54 |
| `serviceresponses` | 60 | | `conversations` | 11 |
| `servicebookings` | 44 | | `pdfs.files` / `pdfs.chunks` | 45 / 45 |
| `contracts` | 18 | | `messaging_files.files` / `.chunks` | 4 / 4 |
| `documents` | 18 | | `avatars.files` / `avatars.chunks` | 0 / 0 |
| `events` | 34 | | `neighborhoods` | 15 |
| `communityvotes` | 18 | | `users` | 72 |
| `votes` | 40 | | `ssotokens` | 0 |

Binary files (contract PDFs, message attachments) are included in the GridFS
chunks, base64-encoded: the dataset stays a text file while restoring the
documents byte for byte. Empty collections hold `[]` and are skipped on
import.

### `neo4j.cypher`

The social graph as 176 node `MERGE` statements and 557 relationship ones,
739 lines in all.

| Nodes | | Relationships | |
|-------|---|---------------|---|
| `User` | 72 | `INTERESTED_IN` | 255 |
| `Service` | 55 | `ATTENDING` | 143 |
| `Event` | 34 | `LIVES_IN` | 55 |
| `Neighborhood` | 15 | `LOCATED_IN` | 55 |
| | | `HELD_IN` | 34 |
| | | `HELPED` | 15 |

Everything is expressed as idempotent `MERGE` statements: replaying the file
against an already-populated database creates no duplicate. Properties (dates,
points, identifiers cross-referenced with PostgreSQL and MongoDB) are
preserved.

## Regenerating the dataset

`scripts/export-dataset.sh` exports the running dev stack into
`demo-dataset/`. Seed the stack first (`make seed`), otherwise it exports an
empty dataset over a good one — the script checks for this and refuses. It
also fails if a personal account leaks into the output.
