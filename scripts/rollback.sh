#!/usr/bin/env bash
# Rollback : revient à un commit précédent et reconstruit la stack.
#
#   Usage : ./scripts/rollback.sh <sha>
#
# Appelé par deploy.yml lorsque le smoke test échoue après un déploiement.
# Doit être exécuté depuis la racine du dépôt déployé sur le VPS.
set -euo pipefail

TARGET_SHA="${1:?Usage: rollback.sh <sha>}"

echo "↩ Rollback vers ${TARGET_SHA}"

git fetch --all --tags --prune
git checkout --force "$TARGET_SHA"

docker compose \
  -f docker/docker-compose.yml \
  -f docker/docker-compose.prod.yml \
  up -d --build --remove-orphans

echo "✓ Rollback terminé sur ${TARGET_SHA}"
