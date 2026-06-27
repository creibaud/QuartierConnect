#!/usr/bin/env bash
# Restauration Neo4j depuis un backup produit par backup-all.sh (dump à froid).
#
#   Usage : ./scripts/restore-neo4j.sh /var/backups/quartierconnect/neo4j-<DATE>.tar.gz
#
# ⚠ Arrête Neo4j, écrase la base 'neo4j', redémarre. Confirmation 'oui'.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE="docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml --env-file .env"
ARCHIVE="${1:?Usage: restore-neo4j.sh <neo4j-archive.tar.gz>}"
[ -f "$ARCHIVE" ] || { echo "✗ Fichier introuvable : $ARCHIVE" >&2; exit 1; }

echo "⚠  Cela va ÉCRASER la base Neo4j 'neo4j' avec :"
echo "   $ARCHIVE"
read -r -p "Confirmer ? Taper 'oui' : " CONFIRM
[ "$CONFIRM" = "oui" ] || { echo "Annulé."; exit 1; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
tar -C "$TMP" -xzf "$ARCHIVE"   # → $TMP/neo4j.dump
chmod -R a+rX "$TMP"            # readable by the neo4j user inside the container

NEO_CID="$($COMPOSE ps -q neo4j)"
$COMPOSE stop neo4j >/dev/null
docker run --rm --volumes-from "$NEO_CID" -v "$TMP":/backups neo4j:5 \
  neo4j-admin database load neo4j --from-path=/backups --overwrite-destination=true
$COMPOSE start neo4j >/dev/null

echo "✓ Neo4j restauré depuis $(basename "$ARCHIVE")"
