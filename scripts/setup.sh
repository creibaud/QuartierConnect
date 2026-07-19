#!/usr/bin/env bash
# One-command QuartierConnect install.
#
#   Usage: ./scripts/setup.sh [--force]
#   (or: make setup / make setup SETUP_FORCE=1)
#
# Checks prerequisites, generates .env, builds the docker stack, waits for
# healthchecks, imports the demo dataset. --force regenerates an existing .env.
set -euo pipefail

cd "$(dirname "$0")/.."

COMPOSE="docker compose -f docker/docker-compose.yml --env-file .env"
HEALTH_TIMEOUT_SECONDS=300
POLL_INTERVAL_SECONDS=5
FORCE="${SETUP_FORCE:-0}"
if [ "${1:-}" = "--force" ]; then
    FORCE=1
fi
ENV_REGENERATED=0

BOLD=$(printf '\033[1m')
GREEN=$(printf '\033[32m')
YELLOW=$(printf '\033[33m')
RED=$(printf '\033[31m')
CYAN=$(printf '\033[36m')
RESET=$(printf '\033[0m')

step() { echo ""; echo "${BOLD}▶ $1${RESET}"; }
ok()   { echo "  ${GREEN}✓${RESET} $1"; }
warn() { echo "  ${YELLOW}⚠${RESET} $1"; }
fail() { echo "  ${RED}✗ $1${RESET}" >&2; exit 1; }

check_prerequisites() {
    step "Checking prerequisites"
    if ! command -v git >/dev/null 2>&1; then
        fail "Git is not installed. Install it (sudo apt install git): https://git-scm.com"
    fi
    if ! command -v docker >/dev/null 2>&1; then
        fail "Docker is not installed. Install it: https://docs.docker.com/get-docker/"
    fi
    if ! docker info >/dev/null 2>&1; then
        fail "The Docker daemon is not responding. Start it (sudo systemctl start docker, or Docker Desktop) then re-run make setup."
    fi
    if ! docker compose version >/dev/null 2>&1; then
        fail "Docker Compose v2 is required (the 'docker compose' command). Update Docker: https://docs.docker.com/compose/install/"
    fi
    if ! command -v openssl >/dev/null 2>&1; then
        fail "openssl is required to generate the .env secrets. Install it: sudo apt install openssl"
    fi
    if ! command -v curl >/dev/null 2>&1; then
        fail "curl is required to check API health. Install it: sudo apt install curl"
    fi
    ok "git, docker, docker compose v2, openssl and curl are available"
}

generate_env_file() {
    step "Configuring .env"
    if [ -f .env ] && [ "$FORCE" != "1" ]; then
        ok "Existing .env kept (make setup SETUP_FORCE=1 to regenerate it)"
        return
    fi
    if [ ! -f .env.example ]; then
        fail ".env.example not found at the repo root."
    fi
    local jwt_secret mongo_password postgres_password neo4j_password
    jwt_secret=$(openssl rand -hex 32)
    mongo_password=$(openssl rand -hex 32)
    postgres_password=$(openssl rand -hex 32)
    neo4j_password=$(openssl rand -hex 32)
    sed -e "s/CHANGE_ME_openssl_rand_base64_32/${jwt_secret}/g" \
        -e "s/CHANGE_ME_mongo_password/${mongo_password}/g" \
        -e "s/CHANGE_ME_postgres_password/${postgres_password}/g" \
        -e "s/CHANGE_ME_neo4j_password/${neo4j_password}/g" \
        .env.example > .env
    if grep -v '^[[:space:]]*#' .env | grep -q "CHANGE_ME"; then
        fail "CHANGE_ME values remain in .env: fill them in by hand (see .env.example)."
    fi
    ENV_REGENERATED=1
    ok ".env generated with random secrets (openssl rand -hex 32)"
}

start_docker_services() {
    step "Building and starting the Docker services"
    if [ "$ENV_REGENERATED" = "1" ]; then
        # A fresh .env means fresh database secrets, but Mongo/Postgres only seed
        # their root user on an empty volume — a volume left over from a previous
        # install keeps the old password and every later connection fails auth.
        # Drop the volumes so the databases re-initialise with the new secrets.
        $COMPOSE down -v --remove-orphans >/dev/null 2>&1 || true
        ok "Database volumes reset (credentials match the new .env)"
    fi
    $COMPOSE up -d --build
    ok "Services started in the background"
}

wait_for_container_health() {
    local service=$1 deadline=$2 container_id status
    container_id=$($COMPOSE ps -q "$service")
    if [ -z "$container_id" ]; then
        fail "Service ${service} did not start (not found via docker compose ps)."
    fi
    while true; do
        status=$(docker inspect --format '{{.State.Health.Status}}' "$container_id" 2>/dev/null || echo "unknown")
        if [ "$status" = "healthy" ]; then
            ok "${service} is healthy"
            return
        fi
        if [ "$(date +%s)" -ge "$deadline" ]; then
            fail "Timed out (5 min): ${service} is '${status}'. Check the logs: make docker-logs"
        fi
        sleep "$POLL_INTERVAL_SECONDS"
    done
}

wait_for_http() {
    local label=$1 url=$2 deadline=$3 status
    while true; do
        status=$(curl -fsS -o /dev/null -w '%{http_code}' --max-time 5 "$url" 2>/dev/null || echo "000")
        if [ "$status" = "200" ]; then
            ok "${label} responds (HTTP 200)"
            return
        fi
        if [ "$(date +%s)" -ge "$deadline" ]; then
            fail "Timed out (5 min): ${label} (${url}) returned HTTP ${status}. Check the logs: make docker-logs"
        fi
        sleep "$POLL_INTERVAL_SECONDS"
    done
}

wait_for_stack() {
    step "Waiting for healthchecks (${HEALTH_TIMEOUT_SECONDS}s max)"
    local deadline=$(( $(date +%s) + HEALTH_TIMEOUT_SECONDS ))
    wait_for_container_health mongo "$deadline"
    wait_for_container_health postgres "$deadline"
    wait_for_http "Neo4j" "http://localhost:7474" "$deadline"
    wait_for_http "API (/health)" "http://localhost:5000/health" "$deadline"
    wait_for_http "Client (via Caddy)" "http://localhost" "$deadline"
}

import_demo_data() {
    step "Importing the demo dataset"
    if [ -f deliverables/test-datasets/import-dataset.sh ]; then
        bash deliverables/test-datasets/import-dataset.sh demo-dataset
        ok "Demo dataset imported (deliverables/test-datasets)"
        restart_api_after_import
    else
        warn "deliverables/test-datasets/import-dataset.sh missing — falling back to make seed (needs make install first)"
        make seed
        ok "Demo data created (make seed)"
    fi
}

restart_api_after_import() {
    step "Restarting the API (recreates the MongoDB indexes)"
    $COMPOSE restart api > /dev/null 2>&1
    local deadline=$(( $(date +%s) + HEALTH_TIMEOUT_SECONDS ))
    wait_for_http "API (/health)" "http://localhost:5000/health" "$deadline"
}

print_summary() {
    echo ""
    echo "${BOLD}${GREEN}✓ Install complete — QuartierConnect is ready${RESET}"
    echo ""
    echo "${BOLD}  Access${RESET}"
    echo "    ${CYAN}Resident client ${RESET} http://localhost           (direct: http://localhost:3000)"
    echo "    ${CYAN}Back-office     ${RESET} http://localhost/admin     (direct: http://localhost:3001)"
    echo "    ${CYAN}API docs        ${RESET} http://localhost/api/docs  (direct: http://localhost:5000/docs)"
    echo "    ${CYAN}Neo4j Browser   ${RESET} http://localhost:7474"
    echo ""
    echo "${BOLD}  Demo accounts${RESET} (password: Demo1234! — TOTP code: make totp)"
    echo "    alice@demo.fr   resident"
    echo "    bob@demo.fr     moderator"
    echo "    admin@demo.fr   admin"
    echo ""
    echo "${BOLD}  Desktop client (JavaFX)${RESET}"
    echo "    make build-desktop && java -jar desktop-app/target/quartierconnect-desktop.jar"
    echo ""
}

main() {
    echo "${BOLD}QuartierConnect — automated install${RESET}"
    check_prerequisites
    generate_env_file
    start_docker_services
    wait_for_stack
    import_demo_data
    print_summary
}

main "$@"
