#!/usr/bin/env bash
# Post-deploy smoke test: checks the API responds on /api/health.
# Usage: ./scripts/smoke-test.sh <base-url>
# A non-zero exit triggers the automatic rollback in deploy.yml.
set -euo pipefail

BASE_URL="${1:?Usage: smoke-test.sh <base-url>}"
HEALTH_URL="${BASE_URL%/}/api/health"
MAX_ATTEMPTS="${SMOKE_MAX_ATTEMPTS:-30}"
SLEEP_SECONDS="${SMOKE_SLEEP_SECONDS:-5}"

echo "Smoke test on ${HEALTH_URL} (${MAX_ATTEMPTS} attempts max)"

for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
  status=$(curl -fsS -o /dev/null -w '%{http_code}' --max-time 10 "$HEALTH_URL" 2>/dev/null || echo "000")
  if [ "$status" = "200" ]; then
    echo "✓ API healthy (HTTP 200) after ${attempt} attempt(s)"
    check_route() {
      local path="$1" expected="$2"
      local code
      code=$(curl -sSL -o /dev/null -w '%{http_code}' --max-time 10 "${BASE_URL%/}${path}" 2>/dev/null || echo "000")
      if [ "$code" != "$expected" ]; then
        echo "✗ ${path} returned ${code} (expected ${expected})" >&2
        exit 1
      fi
      echo "✓ ${path} → ${code}"
    }
    check_route /aide/ 200   # public user docs
    check_route /dev/ 401    # dev docs, behind basic auth
    check_route /docs 401    # Scalar reference, behind basic auth
    if [ -n "${DOCS_AUTH_USER:-}" ] && [ -n "${DOCS_AUTH_PLAINTEXT:-}" ]; then
      auth_code=$(curl -sSL -o /dev/null -w '%{http_code}' --max-time 10 -u "${DOCS_AUTH_USER}:${DOCS_AUTH_PLAINTEXT}" "${BASE_URL%/}/dev/" 2>/dev/null || echo "000")
      if [ "$auth_code" != "200" ]; then
        echo "✗ /dev/ with credentials returned ${auth_code} (expected 200 — broken hash or wrong credentials?)" >&2
        exit 1
      fi
      echo "✓ /dev/ (with credentials) → 200"
    fi
    exit 0
  fi
  echo "  attempt ${attempt}/${MAX_ATTEMPTS}: HTTP ${status} — retrying in ${SLEEP_SECONDS}s"
  sleep "$SLEEP_SECONDS"
done

echo "✗ Smoke test failed: ${HEALTH_URL} never returned 200 after ${MAX_ATTEMPTS} attempts" >&2
exit 1
