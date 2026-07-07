#!/usr/bin/env bash
# Build the desktop client and bake the target instance URL into the JAR,
# so the download offered by the admin needs no user-side configuration.
#
# Usage: scripts/prepare-desktop-download.sh <base-url> [dest-dir]
#   base-url : HTTPS root of the instance, e.g. https://my-instance.example.com
#   dest-dir : where to drop the JAR (default: docker/downloads, served by Caddy)
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
