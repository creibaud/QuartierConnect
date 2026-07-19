#!/usr/bin/env bash
# Restore Neo4j from a backup-all.sh archive (offline dump).
#
#   Usage: ./scripts/restore-neo4j.sh /var/backups/quartierconnect/neo4j-<DATE>.tar.gz
#
# Stops Neo4j, overwrites the 'neo4j' database, restarts. Asks for confirmation.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE="docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml --env-file .env"
ARCHIVE="${1:?Usage: restore-neo4j.sh <neo4j-archive.tar.gz>}"
[ -f "$ARCHIVE" ] || { echo "✗ File not found: $ARCHIVE" >&2; exit 1; }

echo "⚠  This will OVERWRITE the 'neo4j' Neo4j database with:"
echo "   $ARCHIVE"
read -r -p "Confirm? Type 'yes': " CONFIRM
[ "$CONFIRM" = "yes" ] || { echo "Aborted."; exit 1; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
tar -C "$TMP" -xzf "$ARCHIVE"   # → $TMP/neo4j.dump
chmod -R a+rX "$TMP"            # readable by the neo4j user inside the container

NEO_CID="$($COMPOSE ps -q neo4j)"
$COMPOSE stop neo4j >/dev/null
docker run --rm --volumes-from "$NEO_CID" -v "$TMP":/backups neo4j:5 \
  neo4j-admin database load neo4j --from-path=/backups --overwrite-destination=true
$COMPOSE start neo4j >/dev/null

echo "✓ Neo4j restored from $(basename "$ARCHIVE")"
