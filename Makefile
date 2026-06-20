.PHONY: help \
        dev dev-api dev-client dev-admin dev-desktop \
        build build-api build-web build-desktop build-dsl \
        test test-api test-web test-desktop test-dsl \
        test-cov test-e2e test-e2e-web test-watch \
		format format-api format-web format-desktop format-dsl \
        lint lint-api lint-web lint-desktop lint-dsl \
        typecheck \
        docker-up docker-up-build docker-down docker-logs docker-logs-api docker-reset \
        seed seed-demo seed-neo4j totp \
        install install-api install-web install-dsl \
        validate validate-fast \
        hooks \
        status clean clean-modules info

# ─── Couleurs & Styles ─────────────────────────────────────────────────────────
BOLD   := $(shell printf '\033[1m')
DIM    := $(shell printf '\033[2m')
RESET  := $(shell printf '\033[0m')
GREEN  := $(shell printf '\033[32m')
YELLOW := $(shell printf '\033[33m')
CYAN   := $(shell printf '\033[36m')
RED    := $(shell printf '\033[31m')
BLUE   := $(shell printf '\033[34m')
WHITE  := $(shell printf '\033[37m')

OK   := $(GREEN)✓$(RESET)
FAIL := $(RED)✗$(RESET)
RUN  := $(CYAN)▶$(RESET)

# ─── Aide ──────────────────────────────────────────────────────────────────────
help: ## Afficher cette aide
	@echo ""
	@echo "$(BOLD)  QuartierConnect — Commandes disponibles$(RESET)"
	@echo ""
	@echo "  $(BOLD)$(CYAN)DÉVELOPPEMENT$(RESET)"
	@grep -E '^dev[a-zA-Z_-]*:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "    $(CYAN)%-24s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo "  $(BOLD)$(GREEN)TESTS$(RESET)"
	@grep -E '^test[a-zA-Z_-]*:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "    $(GREEN)%-24s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo "  $(BOLD)$(YELLOW)BUILD$(RESET)"
	@grep -E '^build[a-zA-Z_-]*:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "    $(YELLOW)%-24s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo "  $(BOLD)$(WHITE)LINT / TYPECHECK$(RESET)"
	@grep -E '^(lint|typecheck)[a-zA-Z_-]*:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "    $(WHITE)%-24s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo "  $(BOLD)$(BLUE)DOCKER$(RESET)"
	@grep -E '^docker[a-zA-Z_-]*:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "    $(BLUE)%-24s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo "  $(BOLD)UTILS$(RESET)"
	@grep -E '^(seed|totp|install|validate|status|clean|info)[a-zA-Z_-]*:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "    %-24s %s\n", $$1, $$2}'
	@echo ""

# ─── Informations projet ───────────────────────────────────────────────────────
info: ## Afficher les informations du projet
	@echo ""
	@echo "$(BOLD)  QuartierConnect$(RESET)"
	@echo "  $(DIM)Plateforme communautaire de quartier — ESGI 2025-2026$(RESET)"
	@echo ""
	@echo "  Accès local (avec docker-up) :"
	@echo "    $(CYAN)Client  $(RESET) http://localhost"
	@echo "    $(CYAN)Admin   $(RESET) http://localhost/admin"
	@echo "    $(CYAN)API docs$(RESET) http://localhost/api/docs"
	@echo ""
	@echo "  Comptes démo (TOTP: oathtool --totp --base32 JBSWY3DPEHPK3PXP)"
	@echo "    alice@demo.fr / Demo1234!  (resident)"
	@echo "    bob@demo.fr   / Demo1234!  (moderator)"
	@echo "    admin@demo.fr / Demo1234!  (admin)"
	@echo ""

# ─── Statut ────────────────────────────────────────────────────────────────────
status: ## Vérifier l'état des services Docker
	@echo ""
	@echo "$(BOLD)  Services Docker$(RESET)"
	@$(COMPOSE) ps 2>/dev/null || echo "  $(RED)Docker non disponible ou services arrêtés$(RESET)"
	@echo ""
	@echo "$(BOLD)  Tests unitaires (rapide)$(RESET)"
	@cd api && pnpm run test --passWithNoTests --silent 2>/dev/null \
		&& echo "  $(OK) API : tous les tests passent" \
		|| echo "  $(FAIL) API : des tests échouent"
	@echo ""

# ─── Développement ─────────────────────────────────────────────────────────────
dev: ## Lancer API + client + admin en parallèle (hot reload)
	@echo "$(RUN) $(BOLD)Démarrage en mode développement...$(RESET)"
	@make -j3 dev-api dev-client dev-admin

dev-api: ## Lancer l'API NestJS seule (port 5000, hot reload)
	@echo "$(RUN) API NestJS sur :5000"
	@cd api && pnpm run start:dev

dev-client: ## Lancer le client React (port 3000, hot reload)
	@echo "$(RUN) Client React sur :3000"
	@cd web-apps && pnpm --filter client run dev

dev-admin: ## Lancer l'admin React (port 3001, hot reload)
	@echo "$(RUN) Admin React sur :3001"
	@cd web-apps && pnpm --filter admin run dev

dev-desktop: ## Lancer l'app JavaFX en mode dev (javafx:run)
	@echo "$(RUN) JavaFX Desktop"
	@cd desktop-app && ./mvnw clean javafx:run

# ─── Build ─────────────────────────────────────────────────────────────────────
build: build-api build-web build-desktop build-dsl ## Build complet (API + Web + JAR + DSL)
	@echo ""
	@echo "$(OK) $(BOLD)Build complet terminé$(RESET)"

build-api: ## Build l'API NestJS (TypeScript → dist/)
	@echo "$(RUN) Build API..."
	@cd api && pnpm run build
	@echo "$(OK) API buildée → api/dist/"

build-web: ## Build client + admin (Vite, assets optimisés)
	@echo "$(RUN) Build web (client + admin)..."
	@cd web-apps && pnpm run build
	@echo "$(OK) Web buildé → web-apps/apps/*/dist/"

build-desktop: ## Build le fat JAR JavaFX (Maven Shade, ~25 MB)
	@echo "$(RUN) Build desktop JAR..."
	@cd desktop-app && ./mvnw clean package -q
	@echo "$(OK) JAR prêt : $(BOLD)desktop-app/target/quartierconnect-desktop.jar$(RESET)"
	@ls -lh desktop-app/target/quartierconnect-desktop.jar 2>/dev/null | awk '{print "     Taille : " $$5}'

build-dsl: ## Vérifier la syntaxe Python du DSL (ast.parse)
	@echo "$(RUN) Vérification syntaxe DSL..."
	@cd dsl && uv run python -c "import ast, pathlib; [ast.parse(f.read_text()) for f in pathlib.Path('.').glob('*.py')]"
	@echo "$(OK) DSL syntax OK"

# ─── Tests ─────────────────────────────────────────────────────────────────────
test: ## Tous les tests unitaires (API + Web + Desktop + DSL)
	@echo ""
	@echo "$(BOLD)  Tests unitaires — tous composants$(RESET)"
	@echo ""
	@make test-api
	@make test-web
	@make test-desktop
	@make test-dsl
	@echo ""
	@echo "$(OK) $(BOLD)Tous les tests unitaires passent$(RESET)"

test-api: ## Tests unitaires API NestJS (Jest, 236 tests)
	@echo "$(RUN) Tests API (Jest)..."
	@cd api && pnpm run test
	@echo "$(OK) Tests API OK"

test-cov: ## Tests unitaires API + rapport coverage (seuils : stmts 80%, branches 75%)
	@echo "$(RUN) Tests API avec coverage..."
	@cd api && pnpm run test:cov
	@echo "$(OK) Coverage OK — rapport dans api/coverage/lcov-report/index.html"

test-e2e: ## Tests E2E API (Jest supertest — nécessite MongoDB + PostgreSQL)
	@echo "$(RUN) Tests E2E API..."
	@echo "$(DIM)     Prérequis : make docker-up$(RESET)"
	@cd api && pnpm run test:e2e
	@echo "$(OK) Tests E2E API OK"

test-e2e-web: ## Tests E2E Playwright (client + admin — nécessite apps sur :3000/:3001/:5000)
	@echo "$(RUN) Tests E2E Playwright..."
	@echo "$(DIM)     Prérequis : make dev (dans un autre terminal) + make docker-up$(RESET)"
	@cd web-apps && pnpm run test:e2e
	@echo "$(OK) Tests E2E Playwright OK"

test-desktop: ## Tests unitaires Java (Maven Surefire, JUnit 5)
	@echo "$(RUN) Tests Desktop (JUnit)..."
	@cd desktop-app && ./mvnw test -q
	@echo "$(OK) Tests Desktop OK"

test-dsl: ## Tests Python DSL (pytest)
	@echo "$(RUN) Tests DSL (pytest)..."
	@cd dsl && uv run pytest; S=$$?; [ $$S -eq 0 ] || [ $$S -eq 5 ]
	@echo "$(OK) Tests DSL OK"

test-web: ## Tests Vitest web (shared hooks + UI components)
	@echo "$(RUN) Tests Web (Vitest)..."
	@cd web-apps && pnpm --filter @workspace/shared test
	@cd web-apps && pnpm --filter @workspace/ui test
	@echo "$(OK) Tests Web OK"

test-watch: ## Tests API en mode watch interactif
	@cd api && pnpm run test:watch

# ─── Format ────────────────────────────────────────────────────────────────────
format: format-api format-web format-desktop format-dsl ## Format complet (4 composants)
	@echo ""
	@echo "$(OK) $(BOLD)Format complet OK$(RESET)"

format-api: ## Format API NestJS (Prettier)
	@echo "$(RUN) Format API..."
	@cd api && pnpm run format
	@echo "$(OK) Format API OK"

format-web: ## Format monorepo web (Prettier)
	@echo "$(RUN) Format Web..."
	@cd web-apps && pnpm run format
	@echo "$(OK) Format Web OK"

format-desktop: ## Format Java (Prettier via Maven)
	@echo "$(RUN) Format Desktop..."
	@cd desktop-app && ./mvnw clean compile -q
	@echo "$(OK) Format Desktop OK"

format-dsl: ## Format Python DSL (Ruff)
	@echo "$(RUN) Format DSL..."
	@cd dsl && uv run ruff format .
	@echo "$(OK) Format DSL OK"


# ─── Lint ──────────────────────────────────────────────────────────────────────
lint: lint-api lint-web lint-desktop lint-dsl ## Lint complet (4 composants)
	@echo ""
	@echo "$(OK) $(BOLD)Lint complet OK — zéro erreur$(RESET)"

lint-api: ## Lint API NestJS (ESLint + TypeScript strict)
	@echo "$(RUN) Lint API..."
	@cd api && pnpm run lint
	@echo "$(OK) Lint API OK"

lint-web: ## Lint monorepo web (ESLint via Turbo — client + admin + packages)
	@echo "$(RUN) Lint Web..."
	@cd web-apps && pnpm run lint
	@echo "$(OK) Lint Web OK"

lint-desktop: ## Lint Java (compilation stricte Maven — équivalent typecheck)
	@echo "$(RUN) Lint Desktop (compilation Java)..."
	@cd desktop-app && ./mvnw compile -q
	@echo "$(OK) Lint Desktop OK"

lint-dsl: ## Lint Python DSL (Ruff — PEP 8 + règles de qualité)
	@echo "$(RUN) Lint DSL (Ruff)..."
	@cd dsl && uv run ruff check .
	@echo "$(OK) Lint DSL OK"

typecheck: ## Typecheck TypeScript monorepo web (tsc --noEmit)
	@echo "$(RUN) Typecheck Web (tsc)..."
	@cd web-apps && pnpm run typecheck
	@echo "$(OK) Typecheck OK"

# ─── Validation complète ───────────────────────────────────────────────────────
validate: ## Validation CI complète (lint + typecheck + tests + coverage + build)
	@echo ""
	@echo "$(BOLD)╔══════════════════════════════════════════════╗$(RESET)"
	@echo "$(BOLD)║       QuartierConnect — Validation CI        ║$(RESET)"
	@echo "$(BOLD)╚══════════════════════════════════════════════╝$(RESET)"
	@echo ""
	@echo "$(BOLD)  1/8  Lint (4 composants)$(RESET)"
	@make lint
	@echo ""
	@echo "$(BOLD)  2/8  Typecheck TypeScript$(RESET)"
	@make typecheck
	@echo ""
	@echo "$(BOLD)  3/8  Tests unitaires API + coverage$(RESET)"
	@make test-cov
	@echo ""
	@echo "$(BOLD)  4/8  Tests E2E API$(RESET)"
	@make test-e2e
	@echo ""
	@echo "$(BOLD)  5/8  Tests E2E Web (Playwright)$(RESET)"
	@make test-e2e-web
	@echo ""
	@echo "$(BOLD)  6/8  Tests Desktop (JUnit)$(RESET)"
	@make test-desktop
	@echo ""
	@echo "$(BOLD)  7/8  Tests DSL (pytest)$(RESET)"
	@make test-dsl
	@echo ""
	@echo "$(BOLD)  8/8  Build prod complet$(RESET)"
	@make build-api build-web build-dsl
	@echo ""
	@echo "$(BOLD)$(GREEN)╔══════════════════════════════════════════════╗$(RESET)"
	@echo "$(BOLD)$(GREEN)║   ✓  Toutes les validations sont passées     ║$(RESET)"
	@echo "$(BOLD)$(GREEN)╚══════════════════════════════════════════════╝$(RESET)"
	@echo ""

validate-fast: ## Validation rapide (lint + typecheck + tests unitaires uniquement, sans build)
	@echo "$(BOLD)  Validation rapide$(RESET)"
	@make lint
	@make typecheck
	@make test
	@echo "$(OK) $(BOLD)Validation rapide OK$(RESET)"

# ─── Docker ────────────────────────────────────────────────────────────────────
COMPOSE := docker compose -f docker/docker-compose.yml --env-file .env

docker-up: ## Démarrer les 7 services Docker (Caddy + API + Client + Admin + MongoDB + PostgreSQL + Neo4j)
	@echo "$(RUN) Démarrage des services Docker..."
	@$(COMPOSE) up -d
	@echo ""
	@echo "$(OK) Services démarrés :"
	@echo "    Client  → http://localhost"
	@echo "    Admin   → http://localhost/admin"
	@echo "    API     → http://localhost/api/docs"

docker-up-build: ## Démarrer les services Docker avec rebuild des images
	@echo "$(RUN) Rebuild + démarrage..."
	@$(COMPOSE) up -d --build
	@echo "$(OK) Services reconstruits et démarrés"

docker-down: ## Arrêter tous les services Docker
	@echo "$(RUN) Arrêt des services..."
	@$(COMPOSE) down
	@echo "$(OK) Services arrêtés"

docker-logs: ## Afficher les logs en temps réel (tous services)
	@$(COMPOSE) logs -f

docker-logs-api: ## Afficher les logs de l'API uniquement
	@$(COMPOSE) logs -f api

docker-reset: ## Reset complet : arrêt + suppression volumes + rebuild (⚠️ données perdues)
	@echo "$(YELLOW)⚠  Suppression de tous les volumes Docker (données perdues)$(RESET)"
	@read -p "Confirmer ? [y/N] " CONFIRM; [ "$$CONFIRM" = "y" ] || exit 1
	@$(COMPOSE) down -v
	@$(COMPOSE) up -d --build
	@echo "$(OK) Reset complet terminé"

# ─── Seed & données démo ───────────────────────────────────────────────────────
seed: seed-demo seed-neo4j ## Seed complet : comptes démo + graphe Neo4j

seed-demo: ## Créer les 3 comptes démo (alice/bob/admin) dans PostgreSQL + MongoDB
	@echo "$(RUN) Seed démo (alice / bob / admin)..."
	@cd api && npx ts-node ../scripts/seed-demo.ts
	@echo "$(OK) Comptes créés — TOTP secret : JBSWY3DPEHPK3PXP"

seed-neo4j: ## Peupler Neo4j avec les nœuds depuis MongoDB (quartiers, services, événements)
	@echo "$(RUN) Seed Neo4j..."
	@cd api && NEO4J_URI=$$(grep ^NEO4J_URI ../.env | cut -d= -f2-) \
	           NEO4J_USER=$$(grep ^NEO4J_AUTH ../.env | cut -d= -f2- | cut -d/ -f1) \
	           NEO4J_PASSWORD=$$(grep ^NEO4J_AUTH ../.env | cut -d= -f2- | cut -d/ -f2) \
	           MONGO_URI=$$(grep ^MONGO_URI ../.env | cut -d= -f2-) \
	           NODE_PATH=./node_modules npx ts-node --transpile-only --project tsconfig.json ../scripts/seed-neo4j.ts
	@echo "$(OK) Graphe Neo4j peuplé"

totp: ## Générer un code TOTP pour les comptes démo (secret JBSWY3DPEHPK3PXP)
	@echo ""
	@echo "$(BOLD)  Code TOTP (valable 30s) :$(RESET)"
	@oathtool --totp --base32 JBSWY3DPEHPK3PXP 2>/dev/null \
		&& echo "" \
		|| echo "  $(YELLOW)oathtool non disponible. Installer : sudo apt install oathtool$(RESET)"

# ─── Git hooks ───────────────────────────────────────────────────────────────
hooks: ## Activer les git hooks partagés (pre-commit) — à lancer une fois par clone
	@git config core.hooksPath .githooks
	@chmod +x .githooks/* 2>/dev/null || true
	@echo "$(OK) Hooks activés (core.hooksPath = .githooks)"

# ─── Installation ──────────────────────────────────────────────────────────────
install: install-api install-web install-dsl ## Installer toutes les dépendances (pnpm + uv)
	@echo "$(OK) Toutes les dépendances installées"

install-api: ## Installer les dépendances de l'API (pnpm)
	@echo "$(RUN) pnpm install (api)..."
	@cd api && pnpm install

install-web: ## Installer les dépendances du monorepo web (pnpm workspaces)
	@echo "$(RUN) pnpm install (web-apps)..."
	@cd web-apps && pnpm install

install-dsl: ## Installer les dépendances Python DSL (uv)
	@echo "$(RUN) uv sync (dsl)..."
	@cd dsl && uv sync

# ─── Nettoyage ─────────────────────────────────────────────────────────────────
clean: ## Supprimer les artefacts de build (dist/, target/, __pycache__, coverage)
	@echo "$(RUN) Nettoyage des artefacts..."
	@rm -rf api/dist api/coverage
	@rm -rf web-apps/apps/client/dist web-apps/apps/admin/dist
	@rm -rf desktop-app/target
	@find dsl -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
	@find dsl -name "parser.out" -o -name "parsetab.py" | xargs rm -f 2>/dev/null || true
	@make clean-modules
	@echo "$(OK) Nettoyage terminé"

clean-modules: ## Supprimer les node_modules (api + web-apps)
	@echo "$(RUN) Suppression des node_modules..."
	@rm -rf api/node_modules
	@rm -rf web-apps/node_modules
	@rm -rf web-apps/apps/client/node_modules
	@rm -rf web-apps/apps/admin/node_modules
	@echo "$(OK) node_modules supprimés"