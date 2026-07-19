#!/usr/bin/env bash
# Import a test dataset into the 3 databases (PostgreSQL, MongoDB, Neo4j).
#
#   Usage: ./deliverables/test-datasets/import-dataset.sh <demo-dataset|empty-dataset> [--yes]
#
# DESTRUCTIVE: wipes existing data (DROP SCHEMA on PostgreSQL, deleteMany on
# MongoDB, DETACH DELETE on Neo4j) before importing the chosen dataset. Asks for
# confirmation; --yes (or IMPORT_DATASET_YES=1) skips it for scripted use.
# Refuses to run if the environment looks like production. demo-dataset is
# re-runnable as often as needed; empty-dataset is not, since it leaves
# PostgreSQL with no schema until the API restarts and replays its migrations.
# Requires: the dev Docker stack up (make dev) and the API started at least once
# so its migrations have created the PostgreSQL schema.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$ROOT_DIR"

ASSUME_YES="${IMPORT_DATASET_YES:-0}"
DATASET=""
for arg in "$@"; do
  case "$arg" in
    --yes|-y) ASSUME_YES=1 ;;
    *) DATASET="$arg" ;;
  esac
done
[ -n "$DATASET" ] || { echo "Usage: import-dataset.sh <demo-dataset|empty-dataset> [--yes]" >&2; exit 1; }

DATASET_DIR="$SCRIPT_DIR/$DATASET"
case "$DATASET" in
  demo-dataset|empty-dataset) ;;
  *) echo "✗ Unknown dataset: $DATASET (expected demo-dataset or empty-dataset)" >&2; exit 1 ;;
esac
[ -d "$DATASET_DIR" ] || { echo "✗ Directory not found: $DATASET_DIR" >&2; exit 1; }

COMPOSE="docker compose -f docker/docker-compose.yml --env-file .env"

# Read a var from .env (handles '=' inside the value).
env_get() { grep -E "^$1=" .env 2>/dev/null | head -1 | cut -d= -f2- || true; }

PG_USER="$(env_get POSTGRES_USER)";         PG_USER="${PG_USER:-qc}"
PG_DB="$(env_get POSTGRES_DB)";             PG_DB="${PG_DB:-quartierconnect}"
MONGO_USER="$(env_get MONGO_ROOT_USER)";    MONGO_USER="${MONGO_USER:-root}"
MONGO_PASS="$(env_get MONGO_ROOT_PASSWORD)"
MONGO_DB="quartierconnect"
NEO4J_USER="$(env_get NEO4J_USER)";         NEO4J_USER="${NEO4J_USER:-neo4j}"
NEO4J_PASS="$(env_get NEO4J_PASSWORD)"
[ -n "$NEO4J_PASS" ] || NEO4J_PASS="$(env_get NEO4J_AUTH | cut -d/ -f2-)"

psql_exec()   { $COMPOSE exec -T postgres psql -U "$PG_USER" -d "$PG_DB" -v ON_ERROR_STOP=1 "$@"; }
mongosh_exec(){ $COMPOSE exec -T mongo mongosh -u "$MONGO_USER" -p "$MONGO_PASS" --authenticationDatabase admin --quiet "$MONGO_DB" --eval "$1"; }
cypher_exec() { $COMPOSE exec -T neo4j cypher-shell -u "$NEO4J_USER" -p "$NEO4J_PASS" --format plain "$@"; }

production_signals() {
  local signals=()
  if [ "$(env_get NODE_ENV)" = "production" ]; then
    signals+=("NODE_ENV=production in .env")
  fi
  if [ -n "$(env_get PROD_DOMAIN)" ]; then
    signals+=("PROD_DOMAIN set in .env")
  fi
  case "$(env_get CORS_ORIGINS)" in
    https://*) signals+=("CORS_ORIGINS points at an https origin") ;;
  esac
  case "$ROOT_DIR" in
    *deploy*) signals+=("repo sits under a deployment path: $ROOT_DIR") ;;
  esac
  printf '%s\n' ${signals[@]+"${signals[@]}"}
}

# The Compose project name is 'docker' in dev and in prod alike (it comes from
# the directory), so `compose exec postgres` run from a deployment would hit the
# production containers.
refuse_if_production() {
  local signals
  signals="$(production_signals)"
  [ -n "$signals" ] || return 0
  if [ "${IMPORT_DATASET_ALLOW_PROD:-0}" = "1" ]; then
    echo "⚠  Production signals ignored (IMPORT_DATASET_ALLOW_PROD=1)."
    return 0
  fi
  echo "✗ Production environment detected — purge refused:" >&2
  while IFS= read -r signal; do echo "    $signal" >&2; done <<< "$signals"
  echo "  This script wipes all 3 databases: running it here would erase real" >&2
  echo "  data, signed contracts (GridFS) included." >&2
  echo "  To override anyway:" >&2
  echo "    IMPORT_DATASET_ALLOW_PROD=1 $0 $DATASET" >&2
  exit 1
}

confirm_purge() {
  local CONFIRM
  [ "$ASSUME_YES" != "1" ] || return 0
  if [ ! -t 0 ]; then
    echo "✗ Cannot ask for confirmation (non-interactive input): re-run with --yes." >&2
    exit 1
  fi
  echo "⚠  This will WIPE all 3 databases (PostgreSQL, MongoDB, Neo4j) of the"
  echo "   'docker' stack and replace them with the '$DATASET' dataset."
  read -r -p "Confirm? Type 'yes': " CONFIRM
  [ "$CONFIRM" = "yes" ] || { echo "Aborted."; exit 1; }
}

check_schema_present() {
  local tables
  tables="$(psql_exec -Atc "SELECT count(*) FROM pg_tables WHERE schemaname = 'public'")"
  if [ "$tables" -eq 0 ]; then
    echo "✗ No PostgreSQL tables: start the stack (make dev) and let the API" >&2
    echo "  apply its migrations before importing a dataset." >&2
    exit 1
  fi
}

purge_postgres() {
  echo "→ Purging PostgreSQL (resetting the public + drizzle schemas)"
  # The dump recreates schemas and tables (CREATE SCHEMA/TABLE with no IF NOT
  # EXISTS), so start from an empty database rather than TRUNCATE — otherwise the
  # migrations the API already applied collide on restore.
  psql_exec <<'SQL'
DROP SCHEMA IF EXISTS drizzle CASCADE;
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
SQL
}

purge_mongo() {
  echo "→ Purging MongoDB (deleteMany on every collection)"
  mongosh_exec 'db.getCollectionNames().forEach(c => { db.getCollection(c).deleteMany({}); });'
}

purge_neo4j() {
  echo "→ Purging Neo4j (DETACH DELETE on every node)"
  cypher_exec "MATCH (n) DETACH DELETE n;" > /dev/null
}

import_postgres() {
  echo "→ Importing PostgreSQL ($DATASET/postgres.sql)"
  psql_exec --single-transaction < "$DATASET_DIR/postgres.sql" > /dev/null
}

import_mongo() {
  local file collection
  for file in "$DATASET_DIR"/mongo/*.json; do
    collection="$(basename "$file" .json)"
    if [ ! -s "$file" ] || [ "$(tr -d '[:space:]' < "$file")" = "[]" ]; then
      echo "→ Importing MongoDB: $collection (empty collection, skipped)"
      continue
    fi
    echo "→ Importing MongoDB: $collection"
    $COMPOSE exec -T mongo mongoimport -u "$MONGO_USER" -p "$MONGO_PASS" \
      --authenticationDatabase admin --db "$MONGO_DB" --collection "$collection" \
      --jsonArray --drop --quiet < "$file"
  done
}

import_neo4j() {
  echo "→ Importing Neo4j ($DATASET/neo4j.cypher)"
  cypher_exec < "$DATASET_DIR/neo4j.cypher" > /dev/null
}

report_counts() {
  local pg_users mongo_docs neo_nodes
  # The purge drops the schema, so without an import the users table is gone.
  if [ "$(psql_exec -Atc "SELECT to_regclass('public.users') IS NOT NULL")" = "t" ]; then
    pg_users="$(psql_exec -Atc 'SELECT count(*) FROM users')"
  else
    pg_users=0
  fi
  mongo_docs="$(mongosh_exec 'let n = 0; db.getCollectionNames().forEach(c => { n += db.getCollection(c).countDocuments(); }); print(n);')"
  neo_nodes="$(cypher_exec "MATCH (n) RETURN count(n);" | tail -1)"
  echo ""
  echo "Final state: $pg_users PostgreSQL users, $mongo_docs MongoDB documents, $neo_nodes Neo4j nodes."
}

echo "=== Importing the '$DATASET' dataset ==="
refuse_if_production
check_schema_present
confirm_purge
purge_postgres
purge_mongo
purge_neo4j

import_postgres
import_mongo
import_neo4j

report_counts
echo ""
echo "✓ Dataset '$DATASET' imported."
echo "  Restart the API to recreate the MongoDB indexes and clear the caches:"
echo "  docker compose -f docker/docker-compose.yml --env-file .env restart api"
if [ "$DATASET" = "demo-dataset" ]; then
  echo ""
  echo "Demo accounts (password: Demo1234!, TOTP: 4PX635D55YS6JJV3NYIXKZPREIO6YIIV):"
  echo "  - alice@demo.fr  (resident)"
  echo "  - bob@demo.fr    (moderator)"
  echo "  - admin@demo.fr  (admin)"
fi
