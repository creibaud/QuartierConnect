#!/usr/bin/env bash
# Export the running dev stack into deliverables/test-datasets/demo-dataset.
#
#   Usage: ./scripts/export-dataset.sh
#
# Produces the three text files a corrector imports: a PostgreSQL dump (schema
# and data), one JSON file per MongoDB collection, and the Neo4j graph as
# idempotent MERGE statements. Seed the stack first, otherwise you export an
# empty dataset over a good one.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

TARGET="deliverables/test-datasets/demo-dataset"

env_get() { grep -E "^$1=" .env 2>/dev/null | head -1 | cut -d= -f2- || true; }

PG_USER="$(env_get POSTGRES_USER)";      PG_USER="${PG_USER:-qc}"
PG_DB="$(env_get POSTGRES_DB)";          PG_DB="${PG_DB:-quartierconnect}"
MONGO_USER="$(env_get MONGO_ROOT_USER)"; MONGO_USER="${MONGO_USER:-root}"
MONGO_PASS="$(env_get MONGO_ROOT_PASSWORD)"
MONGO_DB="quartierconnect"
NEO4J_USER="$(env_get NEO4J_USER)";      NEO4J_USER="${NEO4J_USER:-neo4j}"
NEO4J_PASS="$(env_get NEO4J_PASSWORD)"
[ -n "$NEO4J_PASS" ] || NEO4J_PASS="$(env_get NEO4J_AUTH | cut -d/ -f2-)"

mongosh_exec() {
  docker exec -i docker-mongo-1 mongosh -u "$MONGO_USER" -p "$MONGO_PASS" \
    --authenticationDatabase admin --quiet "$MONGO_DB" --eval "$1"
}

assert_not_empty() {
  local users
  users="$(docker exec -i docker-postgres-1 psql -U "$PG_USER" -d "$PG_DB" -Atc \
    'SELECT count(*) FROM users')"
  if [ "$users" -eq 0 ]; then
    echo "✗ No user in PostgreSQL: seed the stack before exporting." >&2
    exit 1
  fi
  echo "→ Source stack holds $users users"
}

export_postgres() {
  echo "→ PostgreSQL → $TARGET/postgres.sql"
  docker exec -i docker-postgres-1 pg_dump -U "$PG_USER" -d "$PG_DB" \
    --no-owner --no-privileges > "$TARGET/postgres.sql"
}

export_mongo() {
  local collections collection
  collections="$(mongosh_exec 'print(db.getCollectionNames().sort().join(" "))' | tr -d '\r')"
  rm -f "$TARGET"/mongo/*.json
  mkdir -p "$TARGET/mongo"
  for collection in $collections; do
    echo "→ MongoDB: $collection"
    docker exec -i docker-mongo-1 mongoexport -u "$MONGO_USER" -p "$MONGO_PASS" \
      --authenticationDatabase admin --db "$MONGO_DB" --collection "$collection" \
      --jsonArray --pretty --quiet > "$TARGET/mongo/$collection.json"
  done
}

export_neo4j() {
  echo "→ Neo4j → $TARGET/neo4j.cypher"
  # Run from api/ with NODE_PATH set: scripts/ has no node_modules of its own,
  # so neo4j-driver only resolves from the api workspace.
  (cd "$ROOT_DIR/api" && NODE_PATH=./node_modules \
    NEO4J_URI="${NEO4J_URI:-bolt://localhost:7687}" \
    NEO4J_USER="$NEO4J_USER" NEO4J_PASSWORD="$NEO4J_PASS" \
    ./node_modules/.bin/tsx ../scripts/export-neo4j.ts) > "$TARGET/neo4j.cypher"
}

report() {
  echo ""
  echo "Exported:"
  echo "  postgres.sql   $(grep -c '^COPY ' "$TARGET/postgres.sql") COPY blocks"
  echo "  mongo/         $(ls "$TARGET"/mongo/*.json | wc -l) collections"
  echo "  neo4j.cypher   $(grep -c '^MERGE ' "$TARGET/neo4j.cypher") MERGE statements"
  echo ""
  if grep -rqi 'myskolae' "$TARGET"; then
    echo "✗ A personal account leaked into the dataset. Fix before shipping." >&2
    exit 1
  fi
  # Only seed-neo4j writes User.name; without it the neighbour recommendations
  # render a raw UUID, or nothing at all.
  if ! grep -q '`name`' "$TARGET/neo4j.cypher"; then
    echo "✗ No named node in the graph: run make seed-neo4j, then export again." >&2
    exit 1
  fi
  echo "✓ Dataset exported to $TARGET"
}

echo "=== Exporting the demo dataset ==="
assert_not_empty
export_postgres
export_mongo
export_neo4j
report
