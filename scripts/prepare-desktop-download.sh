#!/usr/bin/env bash
# Construit le client lourd et y injecte l'URL de l'instance cible, afin que le
# JAR proposé au téléchargement depuis l'admin se connecte à cette instance sans
# aucune configuration côté utilisateur.
#
# Usage : scripts/prepare-desktop-download.sh <base-url> [dossier-destination]
#   base-url : racine HTTPS de l'instance, ex. https://mon-instance.example.com
#   dossier  : où déposer le JAR (défaut : docker/downloads, servi par Caddy)
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

BASE_URL="${1:?Usage: prepare-desktop-download.sh <base-url> [dossier-destination]}"
BASE_URL="${BASE_URL%/}"
DEST="${2:-docker/downloads}"

make build-desktop
mkdir -p "$DEST"
DEST_ABS="$(cd "$DEST" && pwd)"
cp desktop-app/target/quartierconnect-desktop.jar "$DEST_ABS/quartierconnect-desktop.jar"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
printf 'api.url=%s/api\nweb.url=%s/admin\n' "$BASE_URL" "$BASE_URL" > "$WORK/server.properties"
( cd "$WORK" && jar uf "$DEST_ABS/quartierconnect-desktop.jar" server.properties )

echo "JAR pré-configuré pour $BASE_URL → $DEST_ABS/quartierconnect-desktop.jar"
