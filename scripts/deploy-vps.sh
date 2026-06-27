#!/usr/bin/env bash
# Déploiement manuel sûr depuis le VPS :
#   capture du SHA → backup → pull → rebuild → smoke test → rollback auto si KO.
#
#   Usage : ./scripts/deploy-vps.sh [branche|tag]   (défaut : main)
#
# Équivalent local du workflow deploy.yml. À exécuter depuis la racine du dépôt.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE="docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml"
REF="${1:-main}"

env_get() { grep -E "^$1=" .env 2>/dev/null | head -1 | cut -d= -f2-; }
DOMAIN="$(env_get PROD_DOMAIN)"; DOMAIN="${DOMAIN:-quartierconnect.fr}"
case "$DOMAIN" in https://*) ;; *) DOMAIN="https://${DOMAIN}";; esac
HOOK="$(env_get DISCORD_WEBHOOK)"

notify() {
  [ -n "$HOOK" ] || return 0
  curl -fsS -X POST -H 'Content-Type: application/json' \
    -d "{\"content\":\"$1\"}" "$HOOK" >/dev/null 2>&1 || true
}

PREV_SHA="$(git rev-parse HEAD)"
echo "▶ Déploiement de '${REF}' (rollback possible vers ${PREV_SHA:0:8})"

# 1. Backup pré-déploiement (best effort)
if [ -x ./scripts/backup-all.sh ]; then
  echo "▶ Backup pré-déploiement…"
  ./scripts/backup-all.sh || echo "⚠ Backup KO — on continue le déploiement"
fi

# 2. Récupération de la référence cible
git fetch --all --tags --prune
git checkout --force "$REF"
git pull --ff-only origin "$REF" 2>/dev/null || true

# 3. Rebuild + redémarrage
$COMPOSE up -d --build --remove-orphans

# 4. Smoke test → rollback automatique si KO
if ./scripts/smoke-test.sh "$DOMAIN"; then
  echo "✓ Déploiement OK sur ${REF}"
  notify "🟢 Deploy OK : ${REF} → ${DOMAIN}"
else
  echo "✗ Smoke test KO — rollback vers ${PREV_SHA:0:8}" >&2
  ./scripts/rollback.sh "$PREV_SHA"
  notify "🔴 Deploy KO → rollback ${PREV_SHA:0:8}"
  exit 1
fi
