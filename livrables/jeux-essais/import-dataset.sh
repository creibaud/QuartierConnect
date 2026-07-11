#!/usr/bin/env bash
# Import d'un jeu d'essai dans les 3 bases (PostgreSQL, MongoDB, Neo4j).
#
#   Usage : ./livrables/jeux-essais/import-dataset.sh <jeu-demo|jeu-vide>
#
# Purge proprement les données existantes (TRUNCATE / deleteMany / DETACH
# DELETE — jamais de DROP DATABASE) puis importe le jeu choisi. Idempotent :
# relançable autant de fois que nécessaire. Prérequis : la pile Docker de dev
# démarrée (make dev) et l'API lancée au moins une fois pour que les
# migrations aient créé le schéma PostgreSQL.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$ROOT_DIR"

DATASET="${1:?Usage: import-dataset.sh <jeu-demo|jeu-vide>}"
DATASET_DIR="$SCRIPT_DIR/$DATASET"
case "$DATASET" in
  jeu-demo|jeu-vide) ;;
  *) echo "✗ Jeu inconnu : $DATASET (attendu : jeu-demo ou jeu-vide)" >&2; exit 1 ;;
esac
[ -d "$DATASET_DIR" ] || { echo "✗ Dossier introuvable : $DATASET_DIR" >&2; exit 1; }

COMPOSE="docker compose -f docker/docker-compose.yml --env-file .env"

# Lecture robuste d'une variable du .env (gère les '=' dans la valeur).
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

check_schema_present() {
  local tables
  tables="$(psql_exec -Atc "SELECT count(*) FROM pg_tables WHERE schemaname = 'public'")"
  if [ "$tables" -eq 0 ]; then
    echo "✗ Aucune table PostgreSQL : démarrez la pile (make dev) et laissez" >&2
    echo "  l'API appliquer ses migrations avant d'importer un jeu d'essai." >&2
    exit 1
  fi
}

purge_postgres() {
  echo "→ Purge PostgreSQL (réinitialisation des schémas public + drizzle)"
  # Le dump recrée les schémas et tables (CREATE SCHEMA/TABLE sans IF NOT EXISTS) :
  # on repart d'une base vide plutôt qu'un TRUNCATE, sinon les migrations déjà
  # appliquées par l'API entrent en conflit à la restauration.
  psql_exec <<'SQL'
DROP SCHEMA IF EXISTS drizzle CASCADE;
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
SQL
}

purge_mongo() {
  echo "→ Purge MongoDB (deleteMany sur toutes les collections)"
  mongosh_exec 'db.getCollectionNames().forEach(c => { db.getCollection(c).deleteMany({}); });'
}

purge_neo4j() {
  echo "→ Purge Neo4j (DETACH DELETE de tous les nœuds)"
  cypher_exec "MATCH (n) DETACH DELETE n;" > /dev/null
}

import_postgres() {
  echo "→ Import PostgreSQL ($DATASET/postgres.sql)"
  psql_exec --single-transaction < "$DATASET_DIR/postgres.sql" > /dev/null
}

import_mongo() {
  local file collection
  for file in "$DATASET_DIR"/mongo/*.json; do
    collection="$(basename "$file" .json)"
    if [ ! -s "$file" ] || [ "$(tr -d '[:space:]' < "$file")" = "[]" ]; then
      echo "→ Import MongoDB : $collection (collection vide, ignorée)"
      continue
    fi
    echo "→ Import MongoDB : $collection"
    $COMPOSE exec -T mongo mongoimport -u "$MONGO_USER" -p "$MONGO_PASS" \
      --authenticationDatabase admin --db "$MONGO_DB" --collection "$collection" \
      --jsonArray --drop --quiet < "$file"
  done
}

import_neo4j() {
  echo "→ Import Neo4j ($DATASET/neo4j.cypher)"
  cypher_exec < "$DATASET_DIR/neo4j.cypher" > /dev/null
}

report_counts() {
  local pg_users mongo_docs neo_nodes
  pg_users="$(psql_exec -Atc 'SELECT count(*) FROM users')"
  mongo_docs="$(mongosh_exec 'let n = 0; db.getCollectionNames().forEach(c => { n += db.getCollection(c).countDocuments(); }); print(n);')"
  neo_nodes="$(cypher_exec "MATCH (n) RETURN count(n);" | tail -1)"
  echo ""
  echo "État final : $pg_users utilisateurs PostgreSQL, $mongo_docs documents MongoDB, $neo_nodes nœuds Neo4j."
}

echo "=== Import du jeu d'essai « $DATASET » ==="
check_schema_present
purge_postgres
purge_mongo
purge_neo4j

if [ "$DATASET" = "jeu-demo" ]; then
  import_postgres
  import_mongo
  import_neo4j
else
  echo "→ Jeu vide : bases purgées, aucune donnée à importer."
  echo "  (schéma PostgreSQL conservé, collections MongoDB recréées à la volée)"
fi

report_counts
echo ""
echo "✓ Jeu « $DATASET » importé."
echo "  Redémarrez l'API pour recréer les index MongoDB et vider les caches :"
echo "  docker compose -f docker/docker-compose.yml --env-file .env restart api"
if [ "$DATASET" = "jeu-demo" ]; then
  echo ""
  echo "Comptes de démonstration (mot de passe : Demo1234!, TOTP : JBSWY3DPEHPK3PXP) :"
  echo "  - alice@demo.fr  (modératrice)"
  echo "  - bob@demo.fr    (modérateur)"
  echo "  - admin@demo.fr  (administrateur)"
fi
