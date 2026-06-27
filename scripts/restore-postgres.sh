#!/usr/bin/env bash
# Restauration PostgreSQL depuis un dump produit par backup-all.sh (pg_dumpall).
#
#   Usage : ./scripts/restore-postgres.sh /var/backups/quartierconnect/postgres-<DATE>.sql.gz
#
# ⚠ Réinjecte le dump global (rôles + bases). Demande une confirmation 'oui'.
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

# pg_dumpall contient les CREATE DATABASE/ROLE : on rejoue dans la base 'postgres'.
gunzip -c "$ARCHIVE" | $COMPOSE exec -T postgres psql -U "$PG_USER" -d postgres

echo "✓ PostgreSQL restauré depuis $(basename "$ARCHIVE")"
