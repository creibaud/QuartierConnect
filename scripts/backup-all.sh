#!/usr/bin/env bash
# Daily backup of the 3 databases (+ Caddy certs on Mondays).
#
#   Usage: ./scripts/backup-all.sh
#
# Installed via ops/cron.d/quartierconnect (daily at 2am, deploy user).
# Reads credentials from .env at the repo root. S3 upload and Discord
# notification are optional (BACKUP_S3_* / DISCORD_WEBHOOK vars).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE="docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml --env-file .env"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/quartierconnect}"
LOG_DIR="${LOG_DIR:-/var/log/quartierconnect}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
DATE="$(date +%Y-%m-%d_%H%M%S)"
DOW="$(date +%u)"   # 1 = Monday
SUMMARY="${LOG_DIR}/backup-summary-$(date +%Y-%m-%d).log"

mkdir -p "$BACKUP_DIR" "$LOG_DIR"

# Read a var from .env (handles '=' inside the value).
env_get() { grep -E "^$1=" .env 2>/dev/null | head -1 | cut -d= -f2- || true; }

log()  { echo "[$(date +%H:%M:%S)] $*" | tee -a "$SUMMARY"; }

notify() {
  local hook; hook="$(env_get DISCORD_WEBHOOK)"
  [ -n "$hook" ] || return 0
  curl -fsS -X POST -H 'Content-Type: application/json' \
    -d "{\"content\":\"$1\"}" "$hook" >/dev/null 2>&1 || true
}

fail() { log "ERROR: $*"; notify "🔴 QuartierConnect backup failed: $*"; exit 1; }

upload_s3() {
  local file="$1" prefix="$2" bucket endpoint
  bucket="$(env_get BACKUP_BUCKET)"; endpoint="$(env_get BACKUP_S3_ENDPOINT)"
  [ -n "$bucket" ] && [ -n "$endpoint" ] || return 0
  if aws s3 cp "$file" "s3://${bucket}/${prefix}/$(basename "$file")" \
       --endpoint-url "https://${endpoint}" >/dev/null 2>&1; then
    log "  ↑ S3 ${prefix}/$(basename "$file")"
  else
    log "  ⚠ S3 upload failed for $(basename "$file")"
  fi
}

MONGO_USER="$(env_get MONGO_ROOT_USER)"; MONGO_USER="${MONGO_USER:-root}"
MONGO_PASS="$(env_get MONGO_ROOT_PASSWORD)"
PG_USER="$(env_get POSTGRES_USER)"; PG_USER="${PG_USER:-qc}"

log "=== Backup start ${DATE} ==="

# ── MongoDB: mongodump --gzip --archive (stdout → host file) ────────────────
MONGO_FILE="${BACKUP_DIR}/mongo-${DATE}.tar.gz"
$COMPOSE exec -T mongo mongodump \
  --username "$MONGO_USER" --password "$MONGO_PASS" \
  --authenticationDatabase admin --db quartierconnect \
  --archive --gzip > "$MONGO_FILE" || fail "mongodump"
log "MongoDB → $(basename "$MONGO_FILE") ($(du -h "$MONGO_FILE" | cut -f1))"
upload_s3 "$MONGO_FILE" mongo

# ── PostgreSQL: pg_dumpall | gzip ───────────────────────────────────────────
PG_FILE="${BACKUP_DIR}/postgres-${DATE}.sql.gz"
$COMPOSE exec -T postgres pg_dumpall -U "$PG_USER" | gzip > "$PG_FILE" \
  || fail "pg_dumpall"
log "PostgreSQL → $(basename "$PG_FILE") ($(du -h "$PG_FILE" | cut -f1))"
upload_s3 "$PG_FILE" postgres

# ── Neo4j: cold dump (~30s downtime) ────────────────────────────────────────
NEO_FILE="${BACKUP_DIR}/neo4j-${DATE}.tar.gz"
NEO_CID="$($COMPOSE ps -q neo4j)"
$COMPOSE stop neo4j >/dev/null || fail "neo4j stop"
# neo4j-admin (uid 7474) can't write to the host bind-mount: dump to /tmp, stream out.
if docker run --rm --volumes-from "$NEO_CID" neo4j:5 \
     sh -c "neo4j-admin database dump neo4j --to-path=/tmp --overwrite-destination=true >&2 && cat /tmp/neo4j.dump" \
     > "${BACKUP_DIR}/neo4j.dump"; then
  $COMPOSE start neo4j >/dev/null || fail "neo4j start"
  tar -C "$BACKUP_DIR" -czf "$NEO_FILE" neo4j.dump && rm -f "${BACKUP_DIR}/neo4j.dump"
  log "Neo4j → $(basename "$NEO_FILE") ($(du -h "$NEO_FILE" | cut -f1))"
  upload_s3 "$NEO_FILE" neo4j
else
  $COMPOSE start neo4j >/dev/null || true
  fail "neo4j-admin dump"
fi

# ── Caddy certs: Mondays only ───────────────────────────────────────────────
if [ "$DOW" = "1" ]; then
  CADDY_FILE="${BACKUP_DIR}/caddy-certs-${DATE}.tar.gz"
  CADDY_CID="$($COMPOSE ps -q caddy)"
  if docker run --rm --volumes-from "$CADDY_CID" -v "$BACKUP_DIR":/backups alpine:3 \
       tar -C /data -czf "/backups/$(basename "$CADDY_FILE")" . 2>/dev/null; then
    log "Caddy certs → $(basename "$CADDY_FILE")"
    upload_s3 "$CADDY_FILE" caddy
  else
    log "⚠ Caddy certs backup failed"
  fi
fi

# ── Local retention ─────────────────────────────────────────────────────────
find "$BACKUP_DIR" -name '*.tar.gz' -mtime "+${RETENTION_DAYS}" -delete 2>/dev/null || true
find "$BACKUP_DIR" -name '*.sql.gz'  -mtime "+${RETENTION_DAYS}" -delete 2>/dev/null || true

log "=== Backup done ${DATE} ==="
