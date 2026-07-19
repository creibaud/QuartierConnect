#!/usr/bin/env bash
# Manual deploy from the VPS:
#   capture SHA → backup → pull → rebuild → smoke test → auto rollback on failure.
#
#   Usage: ./scripts/deploy-vps.sh [branch|tag]   (default: main)
#
# Local equivalent of the deploy.yml workflow. Run from the repo root.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE="docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml --env-file .env"
REF="${1:-main}"

env_get() { grep -E "^$1=" .env 2>/dev/null | head -1 | cut -d= -f2- || true; }
DOMAIN="$(env_get PROD_DOMAIN)"; DOMAIN="${DOMAIN:-quartierconnect.duckdns.org}"
case "$DOMAIN" in https://*) ;; *) DOMAIN="https://${DOMAIN}";; esac
HOOK="$(env_get DISCORD_WEBHOOK)"

notify() {
  [ -n "$HOOK" ] || return 0
  curl -fsS -X POST -H 'Content-Type: application/json' \
    -d "{\"content\":\"$1\"}" "$HOOK" >/dev/null 2>&1 || true
}

PREV_SHA="$(git rev-parse HEAD)"
echo "▶ Deploying '${REF}' (rollback available to ${PREV_SHA:0:8})"

# 1. Pre-deploy backup (best effort)
if [ -x ./scripts/backup-all.sh ]; then
  echo "▶ Pre-deploy backup…"
  ./scripts/backup-all.sh || echo "⚠ Backup failed — carrying on with the deploy"
fi

# 2. Fetch the target ref
git fetch --all --tags --prune
git checkout --force "$REF"
git pull --ff-only origin "$REF" 2>/dev/null || true

# 3. Rebuild + restart
$COMPOSE up -d --build --remove-orphans

# Caddy's image is unchanged, so `up -d` won't re-read the bind-mounted
# Caddyfile; force-recreate it so CSP / routing changes take effect.
$COMPOSE up -d --force-recreate caddy

# 4. Smoke test → automatic rollback on failure
if ./scripts/smoke-test.sh "$DOMAIN"; then
  echo "✓ Deploy OK on ${REF}"
  # Keep the demo accounts' TOTP in sync with DEMO_TOTP_SECRET (best effort).
  ./scripts/seed-prod-demo.sh || true
  notify "🟢 Deploy OK: ${REF} → ${DOMAIN}"
else
  echo "✗ Smoke test failed — rolling back to ${PREV_SHA:0:8}" >&2
  ./scripts/rollback.sh "$PREV_SHA"
  notify "🔴 Deploy failed → rollback ${PREV_SHA:0:8}"
  exit 1
fi
