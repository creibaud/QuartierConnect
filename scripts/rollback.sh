#!/usr/bin/env bash
# Roll back to a previous commit and rebuild the stack.
#
#   Usage: ./scripts/rollback.sh <sha>
#
# Called by deploy.yml when the post-deploy smoke test fails.
# Must run from the root of the deployed repo on the VPS.
set -euo pipefail

TARGET_SHA="${1:?Usage: rollback.sh <sha>}"

echo "↩ Rolling back to ${TARGET_SHA}"

git fetch --all --tags --prune
git checkout --force "$TARGET_SHA"

docker compose --env-file .env \
  -f docker/docker-compose.yml \
  -f docker/docker-compose.prod.yml \
  up -d --build --remove-orphans

echo "✓ Rollback complete on ${TARGET_SHA}"
