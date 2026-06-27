#!/usr/bin/env bash
# Restauration MongoDB depuis un backup produit par backup-all.sh.
#
#   Usage : ./scripts/restore-mongo.sh /var/backups/quartierconnect/mongo-<DATE>.tar.gz
#
# ⚠ Écrase la base 'quartierconnect'. Demande une confirmation 'oui'.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE="docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml"
ARCHIVE="${1:?Usage: restore-mongo.sh <mongo-archive.tar.gz>}"
[ -f "$ARCHIVE" ] || { echo "✗ Fichier introuvable : $ARCHIVE" >&2; exit 1; }

env_get() { grep -E "^$1=" .env 2>/dev/null | head -1 | cut -d= -f2-; }
MONGO_USER="$(env_get MONGO_ROOT_USER)"; MONGO_USER="${MONGO_USER:-root}"
MONGO_PASS="$(env_get MONGO_ROOT_PASSWORD)"

echo "⚠  Cela va ÉCRASER la base MongoDB 'quartierconnect' avec :"
echo "   $ARCHIVE"
read -r -p "Confirmer ? Taper 'oui' : " CONFIRM
[ "$CONFIRM" = "oui" ] || { echo "Annulé."; exit 1; }

$COMPOSE exec -T mongo mongorestore \
  --username "$MONGO_USER" --password "$MONGO_PASS" \
  --authenticationDatabase admin --nsInclude 'quartierconnect.*' \
  --drop --gzip --archive < "$ARCHIVE"

echo "✓ MongoDB restauré depuis $(basename "$ARCHIVE")"
