# Empty dataset

A blank QuartierConnect: the three databases hold the structure the application
needs and no data at all. Import it to grade the app from a genuinely empty
state, or to start a fresh instance.

It ships the same three files as `demo-dataset`, so both import the same way:

| File | Content |
|------|---------|
| `postgres.sql` | Schema only — tables, indexes, constraints, sequences — plus the `drizzle.__drizzle_migrations` rows. Those rows matter: without them the API would replay all ten migrations over tables that already exist, and fail to start. |
| `mongo/*.json` | One empty array per collection. The import skips them, and MongoDB creates each collection on first write. |
| `neo4j.cypher` | No statement. The graph is built by the API as the app is used; the database declares no application constraint or index. |

## Usage

From the repository root, with the Docker stack running:

```bash
./deliverables/test-datasets/import-dataset.sh empty-dataset
```

Then restart the API so it recreates its MongoDB indexes:

```bash
docker compose -f docker/docker-compose.yml --env-file .env restart api
```

You get a working application with no content: create the first account from
the sign-up screen. The first account registered is a resident; promote it from
`admin@demo.fr` or in PostgreSQL if you need a moderator or an administrator.

## Regenerating this dataset

The schema follows the migrations, so regenerate it after adding one:

```bash
docker exec docker-postgres-1 pg_dump -U qc -d quartierconnect \
  --no-owner --no-privileges --schema-only > empty-dataset/postgres.sql
docker exec docker-postgres-1 pg_dump -U qc -d quartierconnect \
  --no-owner --no-privileges --data-only \
  --table='drizzle.__drizzle_migrations' >> empty-dataset/postgres.sql
```
