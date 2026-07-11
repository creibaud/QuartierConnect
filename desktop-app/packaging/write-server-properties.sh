#!/usr/bin/env bash
#
# Writes src/main/resources/server.properties from QC_SERVER_URL so the packaged
# JAR targets a deployed instance without any runtime flag (ServerConfig reads
# /server.properties before falling back to localhost). Without QC_SERVER_URL it
# is a no-op, leaving the localhost defaults for local development builds.
#
# Usage: QC_SERVER_URL=https://example.duckdns.org packaging/write-server-properties.sh
set -euo pipefail

cd "$(dirname "$0")/.."

if [ -z "${QC_SERVER_URL:-}" ]; then
  echo "==> QC_SERVER_URL non défini : server.properties non généré (défauts localhost)"
  exit 0
fi

URL="${QC_SERVER_URL%/}"
DEST="src/main/resources/server.properties"
{
  echo "api.url=${URL}/api"
  echo "web.url=${URL}/admin"
} > "$DEST"

echo "==> server.properties généré : ${URL}"
