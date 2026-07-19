#!/usr/bin/env bash
# Restore MongoDB from a backup-all.sh archive.
#
#   Usage: ./scripts/restore-mongo.sh /var/backups/quartierconnect/mongo-<DATE>.tar.gz
#
# Overwrites the 'quartierconnect' database. Asks for confirmation first.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE="docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml --env-file .env"
ARCHIVE="${1:?Usage: restore-mongo.sh <mongo-archive.tar.gz>}"
[ -f "$ARCHIVE" ] || { echo "✗ File not found: $ARCHIVE" >&2; exit 1; }

env_get() { grep -E "^$1=" .env 2>/dev/null | head -1 | cut -d= -f2- || true; }
MONGO_USER="$(env_get MONGO_ROOT_USER)"; MONGO_USER="${MONGO_USER:-root}"
MONGO_PASS="$(env_get MONGO_ROOT_PASSWORD)"

echo "⚠  This will OVERWRITE the 'quartierconnect' MongoDB database with:"
echo "   $ARCHIVE"
read -r -p "Confirm? Type 'yes': " CONFIRM
[ "$CONFIRM" = "yes" ] || { echo "Aborted."; exit 1; }

$COMPOSE exec -T mongo mongorestore \
  --username "$MONGO_USER" --password "$MONGO_PASS" \
  --authenticationDatabase admin --nsInclude 'quartierconnect.*' \
  --drop --gzip --archive < "$ARCHIVE"

echo "✓ MongoDB restored from $(basename "$ARCHIVE")"
