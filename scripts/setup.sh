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
    step "Vérification des prérequis"
    if ! command -v git >/dev/null 2>&1; then
        fail "Git n'est pas installé. Installez-le (sudo apt install git) : https://git-scm.com"
    fi
    if ! command -v docker >/dev/null 2>&1; then
        fail "Docker n'est pas installé. Installez-le : https://docs.docker.com/get-docker/"
    fi
    if ! docker info >/dev/null 2>&1; then
        fail "Le démon Docker ne répond pas. Démarrez-le (sudo systemctl start docker, ou Docker Desktop) puis relancez make setup."
    fi
    if ! docker compose version >/dev/null 2>&1; then
        fail "Docker Compose v2 est requis (commande « docker compose »). Mettez Docker à jour : https://docs.docker.com/compose/install/"
    fi
    if ! command -v openssl >/dev/null 2>&1; then
        fail "openssl est requis pour générer les secrets du .env. Installez-le : sudo apt install openssl"
    fi
    if ! command -v curl >/dev/null 2>&1; then
        fail "curl est requis pour vérifier la santé de l'API. Installez-le : sudo apt install curl"
    fi
    ok "git, docker, docker compose v2, openssl et curl sont disponibles"
}

generate_env_file() {
    step "Configuration du fichier .env"
    if [ -f .env ] && [ "$FORCE" != "1" ]; then
        ok ".env existant conservé (make setup SETUP_FORCE=1 pour le régénérer)"
        return
    fi
    if [ ! -f .env.example ]; then
        fail "Fichier .env.example introuvable à la racine du dépôt."
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
    if grep -q "CHANGE_ME" .env; then
        fail "Des valeurs CHANGE_ME subsistent dans .env : complétez-les à la main (voir .env.example)."
    fi
    ok ".env généré avec des secrets aléatoires (openssl rand -hex 32)"
}

start_docker_services() {
    step "Construction et démarrage des services Docker"
    $COMPOSE up -d --build
    ok "Services lancés en arrière-plan"
}

wait_for_container_health() {
    local service=$1 deadline=$2 container_id status
    container_id=$($COMPOSE ps -q "$service")
    if [ -z "$container_id" ]; then
        fail "Le service ${service} n'a pas démarré (introuvable via docker compose ps)."
    fi
    while true; do
        status=$(docker inspect --format '{{.State.Health.Status}}' "$container_id" 2>/dev/null || echo "inconnu")
        if [ "$status" = "healthy" ]; then
            ok "${service} est sain"
            return
        fi
        if [ "$(date +%s)" -ge "$deadline" ]; then
            fail "Délai dépassé (5 min) : ${service} est « ${status} ». Consultez les logs : make docker-logs"
        fi
        sleep "$POLL_INTERVAL_SECONDS"
    done
}

wait_for_http() {
    local label=$1 url=$2 deadline=$3 status
    while true; do
        status=$(curl -fsS -o /dev/null -w '%{http_code}' --max-time 5 "$url" 2>/dev/null || echo "000")
        if [ "$status" = "200" ]; then
            ok "${label} répond (HTTP 200)"
            return
        fi
        if [ "$(date +%s)" -ge "$deadline" ]; then
            fail "Délai dépassé (5 min) : ${label} (${url}) répond HTTP ${status}. Consultez les logs : make docker-logs"
        fi
        sleep "$POLL_INTERVAL_SECONDS"
    done
}

wait_for_stack() {
    step "Attente des healthchecks (${HEALTH_TIMEOUT_SECONDS}s maximum)"
    local deadline=$(( $(date +%s) + HEALTH_TIMEOUT_SECONDS ))
    wait_for_container_health mongo "$deadline"
    wait_for_container_health postgres "$deadline"
    wait_for_http "Neo4j" "http://localhost:7474" "$deadline"
    wait_for_http "API (/health)" "http://localhost:5000/health" "$deadline"
    wait_for_http "Client (via Caddy)" "http://localhost" "$deadline"
}

import_demo_data() {
    step "Import du jeu de démonstration"
    if [ -f livrables/jeux-essais/import-dataset.sh ]; then
        bash livrables/jeux-essais/import-dataset.sh jeu-demo
        ok "Jeu de démonstration importé (livrables/jeux-essais)"
        restart_api_after_import
    else
        warn "livrables/jeux-essais/import-dataset.sh absent — repli sur make seed (nécessite make install au préalable)"
        make seed
        ok "Données de démonstration créées (make seed)"
    fi
}

restart_api_after_import() {
    step "Redémarrage de l'API (recréation des index MongoDB)"
    $COMPOSE restart api > /dev/null 2>&1
    local deadline=$(( $(date +%s) + HEALTH_TIMEOUT_SECONDS ))
    wait_for_http "API (/health)" "http://localhost:5000/health" "$deadline"
}

print_summary() {
    echo ""
    echo "${BOLD}${GREEN}✓ Installation terminée — QuartierConnect est prêt${RESET}"
    echo ""
    echo "${BOLD}  Accès${RESET}"
    echo "    ${CYAN}Client résident ${RESET} http://localhost           (direct : http://localhost:3000)"
    echo "    ${CYAN}Back-office     ${RESET} http://localhost/admin     (direct : http://localhost:3001)"
    echo "    ${CYAN}Docs API        ${RESET} http://localhost/api/docs  (direct : http://localhost:5000/docs)"
    echo "    ${CYAN}Neo4j Browser   ${RESET} http://localhost:7474"
    echo ""
    echo "${BOLD}  Comptes démo${RESET} (mot de passe : Demo1234! — code TOTP : make totp)"
    echo "    alice@demo.fr   résident"
    echo "    bob@demo.fr     modérateur"
    echo "    admin@demo.fr   administrateur"
    echo ""
    echo "${BOLD}  Client lourd (JavaFX)${RESET}"
    echo "    make build-desktop && java -jar desktop-app/target/quartierconnect-desktop.jar"
    echo ""
}

main() {
    echo "${BOLD}QuartierConnect — Installation automatique${RESET}"
    check_prerequisites
    generate_env_file
    start_docker_services
    wait_for_stack
    import_demo_data
    print_summary
}

main "$@"
