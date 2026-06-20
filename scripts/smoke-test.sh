#!/usr/bin/env bash
# Smoke test post-déploiement : vérifie que l'API répond sur /api/health.
#
#   Usage : ./scripts/smoke-test.sh <base-url>
#   Exemple : ./scripts/smoke-test.sh https://quartierconnect.example.com
#
# Une sortie != 0 déclenche le rollback automatique dans deploy.yml.
set -euo pipefail

BASE_URL="${1:?Usage: smoke-test.sh <base-url>}"
HEALTH_URL="${BASE_URL%/}/api/health"
MAX_ATTEMPTS="${SMOKE_MAX_ATTEMPTS:-30}"
SLEEP_SECONDS="${SMOKE_SLEEP_SECONDS:-5}"

echo "Smoke test sur ${HEALTH_URL} (${MAX_ATTEMPTS} essais max)"

for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
  status=$(curl -fsS -o /dev/null -w '%{http_code}' --max-time 10 "$HEALTH_URL" 2>/dev/null || echo "000")
  if [ "$status" = "200" ]; then
    echo "✓ API saine (HTTP 200) après ${attempt} essai(s)"
    exit 0
  fi
  echo "  essai ${attempt}/${MAX_ATTEMPTS} : HTTP ${status} — nouvelle tentative dans ${SLEEP_SECONDS}s"
  sleep "$SLEEP_SECONDS"
done

echo "✗ Smoke test échoué : ${HEALTH_URL} n'a pas répondu 200 après ${MAX_ATTEMPTS} essais" >&2
exit 1
