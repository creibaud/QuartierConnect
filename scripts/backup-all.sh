#!/usr/bin/env bash
# Backup quotidien des 3 bases (+ certificats Caddy le lundi).
#
#   Usage : ./scripts/backup-all.sh
#
# Installé via ops/cron.d/quartierconnect (tous les jours à 2h, user deploy).
# Lit les identifiants depuis .env à la racine du dépôt. Upload S3 et
# notification Discord optionnels (variables BACKUP_S3_* / DISCORD_WEBHOOK).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE="docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml --env-file .env"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/quartierconnect}"
LOG_DIR="${LOG_DIR:-/var/log/quartierconnect}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
DATE="$(date +%Y-%m-%d_%H%M%S)"
DOW="$(date +%u)"   # 1 = lundi
SUMMARY="${LOG_DIR}/backup-summary-$(date +%Y-%m-%d).log"

mkdir -p "$BACKUP_DIR" "$LOG_DIR"

# Lecture robuste d'une variable du .env (gère les '=' dans la valeur).
env_get() { grep -E "^$1=" .env 2>/dev/null | head -1 | cut -d= -f2- || true; }

log()  { echo "[$(date +%H:%M:%S)] $*" | tee -a "$SUMMARY"; }

notify() {
  local hook; hook="$(env_get DISCORD_WEBHOOK)"
  [ -n "$hook" ] || return 0
  curl -fsS -X POST -H 'Content-Type: application/json' \
    -d "{\"content\":\"$1\"}" "$hook" >/dev/null 2>&1 || true
}

fail() { log "ERREUR : $*"; notify "🔴 Backup QuartierConnect KO : $*"; exit 1; }

upload_s3() {
  local file="$1" prefix="$2" bucket endpoint
  bucket="$(env_get BACKUP_BUCKET)"; endpoint="$(env_get BACKUP_S3_ENDPOINT)"
  [ -n "$bucket" ] && [ -n "$endpoint" ] || return 0
  if aws s3 cp "$file" "s3://${bucket}/${prefix}/$(basename "$file")" \
       --endpoint-url "https://${endpoint}" >/dev/null 2>&1; then
    log "  ↑ S3 ${prefix}/$(basename "$file")"
  else
    log "  ⚠ Upload S3 échoué pour $(basename "$file")"
  fi
}

MONGO_USER="$(env_get MONGO_ROOT_USER)"; MONGO_USER="${MONGO_USER:-root}"
MONGO_PASS="$(env_get MONGO_ROOT_PASSWORD)"
PG_USER="$(env_get POSTGRES_USER)"; PG_USER="${PG_USER:-qc}"

log "=== Backup début ${DATE} ==="

# ── MongoDB : mongodump --gzip --archive (stdout → fichier hôte) ─────────────
MONGO_FILE="${BACKUP_DIR}/mongo-${DATE}.tar.gz"
$COMPOSE exec -T mongo mongodump \
  --username "$MONGO_USER" --password "$MONGO_PASS" \
  --authenticationDatabase admin --db quartierconnect \
  --archive --gzip > "$MONGO_FILE" || fail "mongodump"
log "MongoDB → $(basename "$MONGO_FILE") ($(du -h "$MONGO_FILE" | cut -f1))"
upload_s3 "$MONGO_FILE" mongo

# ── PostgreSQL : pg_dumpall | gzip ──────────────────────────────────────────
PG_FILE="${BACKUP_DIR}/postgres-${DATE}.sql.gz"
$COMPOSE exec -T postgres pg_dumpall -U "$PG_USER" | gzip > "$PG_FILE" \
  || fail "pg_dumpall"
log "PostgreSQL → $(basename "$PG_FILE") ($(du -h "$PG_FILE" | cut -f1))"
upload_s3 "$PG_FILE" postgres

# ── Neo4j : dump à froid (~30s d'indisponibilité) ───────────────────────────
NEO_FILE="${BACKUP_DIR}/neo4j-${DATE}.tar.gz"
NEO_CID="$($COMPOSE ps -q neo4j)"
$COMPOSE stop neo4j >/dev/null || fail "arrêt neo4j"
# neo4j-admin runs as the neo4j user (uid 7474) and cannot write to a host
# bind-mount owned by another user, so dump to the container's /tmp and stream
# the result to the host file instead.
if docker run --rm --volumes-from "$NEO_CID" neo4j:5 \
     sh -c "neo4j-admin database dump neo4j --to-path=/tmp --overwrite-destination=true >&2 && cat /tmp/neo4j.dump" \
     > "${BACKUP_DIR}/neo4j.dump"; then
  $COMPOSE start neo4j >/dev/null || fail "redémarrage neo4j"
  tar -C "$BACKUP_DIR" -czf "$NEO_FILE" neo4j.dump && rm -f "${BACKUP_DIR}/neo4j.dump"
  log "Neo4j → $(basename "$NEO_FILE") ($(du -h "$NEO_FILE" | cut -f1))"
  upload_s3 "$NEO_FILE" neo4j
else
  $COMPOSE start neo4j >/dev/null || true
  fail "neo4j-admin dump"
fi

# ── Certificats Caddy : le lundi uniquement ─────────────────────────────────
if [ "$DOW" = "1" ]; then
  CADDY_FILE="${BACKUP_DIR}/caddy-certs-${DATE}.tar.gz"
  CADDY_CID="$($COMPOSE ps -q caddy)"
  if docker run --rm --volumes-from "$CADDY_CID" -v "$BACKUP_DIR":/backups alpine:3 \
       tar -C /data -czf "/backups/$(basename "$CADDY_FILE")" . 2>/dev/null; then
    log "Caddy certs → $(basename "$CADDY_FILE")"
    upload_s3 "$CADDY_FILE" caddy
  else
    log "⚠ Backup certificats Caddy échoué"
  fi
fi

# ── Rétention locale ────────────────────────────────────────────────────────
find "$BACKUP_DIR" -name '*.tar.gz' -mtime "+${RETENTION_DAYS}" -delete 2>/dev/null || true
find "$BACKUP_DIR" -name '*.sql.gz'  -mtime "+${RETENTION_DAYS}" -delete 2>/dev/null || true

log "=== Backup OK ${DATE} ==="
