#!/usr/bin/env bash
# Restore PostgreSQL from a backup-all.sh dump (pg_dumpall).
#
#   Usage: ./scripts/restore-postgres.sh /var/backups/quartierconnect/postgres-<DATE>.sql.gz
#
# Replays the global dump (roles + databases). Asks for confirmation first.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE="docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml --env-file .env"
ARCHIVE="${1:?Usage: restore-postgres.sh <postgres-dump.sql.gz>}"
[ -f "$ARCHIVE" ] || { echo "✗ Fichier introuvable : $ARCHIVE" >&2; exit 1; }

env_get() { grep -E "^$1=" .env 2>/dev/null | head -1 | cut -d= -f2- || true; }
PG_USER="$(env_get POSTGRES_USER)"; PG_USER="${PG_USER:-qc}"

echo "⚠  Cela va RÉÉCRIRE les données PostgreSQL avec :"
echo "   $ARCHIVE"
read -r -p "Confirmer ? Taper 'oui' : " CONFIRM
[ "$CONFIRM" = "oui" ] || { echo "Annulé."; exit 1; }

# pg_dumpall includes CREATE DATABASE/ROLE, so replay into the 'postgres' db.
gunzip -c "$ARCHIVE" | $COMPOSE exec -T postgres psql -U "$PG_USER" -d postgres

echo "✓ PostgreSQL restauré depuis $(basename "$ARCHIVE")"
