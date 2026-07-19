#!/usr/bin/env bash
# Re-seed the demo accounts (alice / bob / admin) so their TOTP secret always
# matches the current DEMO_TOTP_SECRET in .env. Run at the end of a deploy to
# stop the demo login from drifting when the secret is rotated.
#
# The VPS host has no Node runtime (everything is containerized), and the seed
# needs both `docker exec` (to write the users in Postgres) and network access
# to the API — so it runs in an ephemeral node container with the docker socket
# and host network mounted. Best effort: a seed failure never fails the deploy.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

env_get() { grep -E "^$1=" .env 2>/dev/null | head -1 | cut -d= -f2- || true; }

PG_CONTAINER="$(docker ps --format '{{.Names}}' | grep -i postgres | head -1 || true)"
if [ -z "$PG_CONTAINER" ]; then
  echo "⚠ Demo seed skipped: no postgres container found."
  exit 0
fi

echo "▶ Re-seeding the demo accounts (current secret, container $PG_CONTAINER)…"
if docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v "$ROOT_DIR:/repo" -w /repo \
  --network host \
  -e DEMO_TOTP_SECRET="$(env_get DEMO_TOTP_SECRET)" \
  -e POSTGRES_USER="$(env_get POSTGRES_USER)" \
  -e POSTGRES_DB="$(env_get POSTGRES_DB)" \
  -e API_URL="http://localhost:5000" \
  -e PG_CONTAINER="$PG_CONTAINER" \
  node:22-alpine sh -c "apk add --no-cache docker-cli >/dev/null 2>&1 && npx --yes tsx scripts/seed-demo.ts"; then
  echo "✓ Demo accounts re-seeded (make totp prints the current code)."
else
  echo "⚠ Demo seed failed (non-blocking) — the demo login may have drifted."
fi
exit 0
