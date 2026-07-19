.PHONY: help \
        setup dist \
        dev dev-api dev-client dev-admin dev-desktop \
        build build-api build-web build-desktop build-dsl package-desktop \
        test test-api test-web test-desktop test-dsl \
        test-cov test-e2e test-e2e-web test-watch \
		format format-api format-web format-desktop format-dsl \
        lint lint-api lint-web lint-desktop lint-dsl \
        typecheck \
        docker-up docker-up-build docker-down docker-logs docker-logs-api docker-reset \
        db-migrate seed seed-demo seed-neo4j totp \
        install install-api install-web install-dsl \
        validate validate-fast \
        hooks \
        status clean clean-modules info

# ─── Colors & styles ───────────────────────────────────────────────────────────
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

# ─── Help ──────────────────────────────────────────────────────────────────────
help: ## Show this help
	@echo ""
	@echo "$(BOLD)  QuartierConnect — Available commands$(RESET)"
	@echo ""
	@echo "  $(BOLD)SETUP / DELIVERABLES$(RESET)"
	@grep -E '^(setup|dist):.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "    $(BOLD)%-24s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo "  $(BOLD)$(CYAN)DEVELOPMENT$(RESET)"
	@grep -E '^dev[a-zA-Z0-9_-]*:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "    $(CYAN)%-24s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo "  $(BOLD)$(GREEN)TESTS$(RESET)"
	@grep -E '^test[a-zA-Z0-9_-]*:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "    $(GREEN)%-24s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo "  $(BOLD)$(YELLOW)BUILD$(RESET)"
	@grep -E '^(build|package)[a-zA-Z0-9_-]*:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "    $(YELLOW)%-24s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo "  $(BOLD)$(WHITE)LINT / TYPECHECK / FORMAT$(RESET)"
	@grep -E '^(lint|typecheck|format)[a-zA-Z0-9_-]*:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "    $(WHITE)%-24s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo "  $(BOLD)$(BLUE)DOCKER$(RESET)"
	@grep -E '^docker[a-zA-Z0-9_-]*:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "    $(BLUE)%-24s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo "  $(BOLD)UTILS$(RESET)"
	@grep -E '^(db-migrate|seed|totp|install|validate|status|clean|info|hooks)[a-zA-Z0-9_-]*:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "    %-24s %s\n", $$1, $$2}'
	@echo ""

# ─── Project info ──────────────────────────────────────────────────────────────
info: ## Show project info
	@echo ""
	@echo "$(BOLD)  QuartierConnect$(RESET)"
	@echo "  $(DIM)Neighborhood community platform — ESGI 2025-2026$(RESET)"
	@echo ""
	@echo "  Local access (with docker-up):"
	@echo "    $(CYAN)Client  $(RESET) http://localhost"
	@echo "    $(CYAN)Admin   $(RESET) http://localhost/admin"
	@echo "    $(CYAN)API docs$(RESET) http://localhost/api/docs"
	@echo ""
	@echo "  Demo accounts (one TOTP secret each — run make totp)"
	@echo "    alice@demo.fr / Demo1234!  (resident)"
	@echo "    bob@demo.fr   / Demo1234!  (moderator)"
	@echo "    admin@demo.fr / Demo1234!  (admin)"
	@echo ""

# ─── Status ────────────────────────────────────────────────────────────────────
status: ## Check Docker service status
	@echo ""
	@echo "$(BOLD)  Docker services$(RESET)"
	@$(COMPOSE) ps 2>/dev/null || echo "  $(RED)Docker unavailable or services stopped$(RESET)"
	@echo ""
	@echo "$(BOLD)  Unit tests (quick)$(RESET)"
	@cd api && pnpm run test --passWithNoTests --silent 2>/dev/null \
		&& echo "  $(OK) API: all tests pass" \
		|| echo "  $(FAIL) API: some tests fail"
	@echo ""

# ─── Setup & deliverables ──────────────────────────────────────────────────────
setup: ## One-command full setup (prereqs + .env + Docker + demo)
	@SETUP_FORCE="$(SETUP_FORCE)" ./scripts/setup.sh



dist: ## Deliverable archive in dist/ (source zip + desktop JAR + test datasets)
	@echo "$(RUN) $(BOLD)Building the deliverable archive...$(RESET)"
	@mkdir -p dist
	@VERSION=$$(git describe --always | tr '/' '-'); \
	ZIP="dist/quartierconnect-sources-$$VERSION.zip"; \
	git archive --format=zip --output "$$ZIP" HEAD; \
	echo "$(OK) Sources: $$ZIP"; \
	if [ -f desktop-app/target/quartierconnect-desktop.jar ]; then \
		cp desktop-app/target/quartierconnect-desktop.jar dist/; \
		echo "$(OK) Desktop executable: dist/quartierconnect-desktop.jar"; \
	else \
		echo "$(YELLOW)⚠  Desktop JAR missing — run make build-desktop then make dist to include it$(RESET)"; \
	fi; \
	if [ -d deliverables/test-datasets ]; then \
		rm -rf dist/test-datasets; \
		cp -r deliverables/test-datasets dist/test-datasets; \
		echo "$(OK) Test datasets: dist/test-datasets/"; \
	fi
	@echo ""
	@echo "$(BOLD)  dist/ layout:$(RESET)"
	@echo "    quartierconnect-sources-<version>.zip   Full sources (git archive)"
	@echo "    quartierconnect-desktop.jar             Desktop executable (if built)"
	@echo "    test-datasets/                          Datasets to import (if present)"

# ─── Development ───────────────────────────────────────────────────────────────
dev: ## Start Docker databases (mongo/postgres/neo4j) + API + client + admin (hot reload)
	@echo "$(RUN) $(BOLD)Starting dev mode...$(RESET)"
	@echo "$(RUN) Docker databases (mongo, postgres, neo4j)..."
	@$(COMPOSE) up -d mongo postgres neo4j
	@make -j3 dev-api dev-client dev-admin

dev-api: ## Start the NestJS API alone (port 5000, hot reload)
	@echo "$(RUN) NestJS API on :5000"
	@cd api && pnpm run start:dev

dev-client: ## Start the React client (port 3000, hot reload)
	@echo "$(RUN) React client on :3000"
	@cd web-apps && pnpm --filter client run dev

dev-admin: ## Start the React admin (port 3001, hot reload)
	@echo "$(RUN) React admin on :3001"
	@cd web-apps && pnpm --filter admin run dev

dev-desktop: ## Run the JavaFX app in dev mode (javafx:run)
	@echo "$(RUN) JavaFX Desktop"
	@cd desktop-app && ./mvnw clean javafx:run

# ─── Build ─────────────────────────────────────────────────────────────────────
build: build-api build-web build-desktop build-dsl ## Full build (API + Web + JAR + DSL)
	@echo ""
	@echo "$(OK) $(BOLD)Full build done$(RESET)"

build-api: ## Build the NestJS API (TypeScript → dist/)
	@echo "$(RUN) Build API..."
	@cd api && pnpm run build
	@echo "$(OK) API built → api/dist/"

build-web: ## Build client + admin (Vite, optimized assets)
	@echo "$(RUN) Build web (client + admin)..."
	@cd web-apps && pnpm run build
	@echo "$(OK) Web built → web-apps/apps/*/dist/"

build-desktop: ## Build the JavaFX fat JAR (Maven Shade, ~25 MB)
	@echo "$(RUN) Build desktop JAR..."
	@cd desktop-app && ./mvnw clean package -q
	@echo "$(OK) JAR ready: $(BOLD)desktop-app/target/quartierconnect-desktop.jar$(RESET)"
	@ls -lh desktop-app/target/quartierconnect-desktop.jar 2>/dev/null | awk '{print "     Size: " $$5}'

package-desktop: ## Build the native desktop installer for the host OS (jpackage)
	@echo "$(RUN) Building desktop installer (jpackage)..."
	@cd desktop-app && ./packaging/jpackage-build.sh
	@echo "$(OK) Installer ready: $(BOLD)desktop-app/target/installer/$(RESET)"

build-dsl: ## Check the DSL Python syntax (ast.parse)
	@echo "$(RUN) Checking DSL syntax..."
	@cd dsl && uv run python -c "import ast, pathlib; [ast.parse(f.read_text()) for f in pathlib.Path('.').glob('*.py')]"
	@echo "$(OK) DSL syntax OK"

# ─── Tests ─────────────────────────────────────────────────────────────────────
test: ## All unit tests (API + Web + Desktop + DSL)
	@echo ""
	@echo "$(BOLD)  Unit tests — all components$(RESET)"
	@echo ""
	@make test-api
	@make test-web
	@make test-desktop
	@make test-dsl
	@echo ""
	@echo "$(OK) $(BOLD)All unit tests pass$(RESET)"

test-api: ## NestJS API unit tests (Jest, 529 tests)
	@echo "$(RUN) API tests (Jest)..."
	@cd api && pnpm run test
	@echo "$(OK) API tests OK"

test-cov: ## API unit tests + coverage report (thresholds: stmts 80%, branches 75%)
	@echo "$(RUN) API tests with coverage..."
	@cd api && pnpm run test:cov
	@echo "$(OK) Coverage OK — report at api/coverage/lcov-report/index.html"

test-e2e: ## API E2E tests (Jest supertest — needs MongoDB + PostgreSQL)
	@echo "$(RUN) API E2E tests..."
	@echo "$(DIM)     Requires: make docker-up$(RESET)"
	@cd api && pnpm run test:e2e
	@echo "$(OK) API E2E tests OK"

test-e2e-web: ## Playwright E2E tests (client + admin — needs apps on :3000/:3001/:5000)
	@echo "$(RUN) Playwright E2E tests..."
	@echo "$(DIM)     Requires: make dev (in another terminal) + make docker-up$(RESET)"
	@cd web-apps && pnpm run test:e2e
	@echo "$(OK) Playwright E2E tests OK"

test-desktop: ## Java unit tests (Maven Surefire, JUnit 5)
	@echo "$(RUN) Desktop tests (JUnit)..."
	@cd desktop-app && if command -v xvfb-run >/dev/null 2>&1; then \
		xvfb-run -a ./mvnw test -q; \
	else \
		./mvnw test -q; \
	fi
	@echo "$(OK) Desktop tests OK"

test-dsl: ## Python DSL tests (pytest)
	@echo "$(RUN) DSL tests (pytest)..."
	@cd dsl && uv run pytest; S=$$?; [ $$S -eq 0 ] || [ $$S -eq 5 ]
	@echo "$(OK) DSL tests OK"

test-web: ## Web Vitest tests (shared hooks + UI components)
	@echo "$(RUN) Web tests (Vitest)..."
	@cd web-apps && pnpm --filter @workspace/shared test
	@cd web-apps && pnpm --filter @workspace/ui test
	@cd web-apps && pnpm --filter client test
	@echo "$(OK) Web tests OK"

test-watch: ## API tests in interactive watch mode
	@cd api && pnpm run test:watch

# ─── Format ────────────────────────────────────────────────────────────────────
format: format-api format-web format-desktop format-dsl ## Full format (4 components)
	@echo ""
	@echo "$(OK) $(BOLD)Full format OK$(RESET)"

format-api: ## Format the NestJS API (Prettier)
	@echo "$(RUN) Format API..."
	@cd api && pnpm run format
	@echo "$(OK) Format API OK"

format-web: ## Format the web monorepo (Prettier)
	@echo "$(RUN) Format Web..."
	@cd web-apps && pnpm run format
	@echo "$(OK) Format Web OK"

format-desktop: ## Format Java (Prettier via Maven)
	@echo "$(RUN) Format Desktop..."
	@cd desktop-app && ./mvnw clean compile -q
	@echo "$(OK) Format Desktop OK"

format-dsl: ## Format the Python DSL (Ruff)
	@echo "$(RUN) Format DSL..."
	@cd dsl && uv run ruff format .
	@echo "$(OK) Format DSL OK"


# ─── Lint ──────────────────────────────────────────────────────────────────────
lint: lint-api lint-web lint-desktop lint-dsl ## Full lint (4 components)
	@echo ""
	@echo "$(OK) $(BOLD)Full lint OK — zero errors$(RESET)"

lint-api: ## Lint the NestJS API (ESLint + TypeScript strict)
	@echo "$(RUN) Lint API..."
	@cd api && pnpm run lint
	@echo "$(OK) Lint API OK"

lint-web: ## Lint the web monorepo (ESLint via Turbo — client + admin + packages)
	@echo "$(RUN) Lint Web..."
	@cd web-apps && pnpm run lint
	@echo "$(OK) Lint Web OK"

lint-desktop: ## Lint Java (strict Maven compile — typecheck equivalent)
	@echo "$(RUN) Lint Desktop (Java compile)..."
	@cd desktop-app && ./mvnw compile -q
	@echo "$(OK) Lint Desktop OK"

lint-dsl: ## Lint the Python DSL (Ruff — PEP 8 + quality rules)
	@echo "$(RUN) Lint DSL (Ruff)..."
	@cd dsl && uv run ruff check .
	@echo "$(OK) Lint DSL OK"

typecheck: ## Typecheck the web monorepo (tsc --noEmit)
	@echo "$(RUN) Typecheck Web (tsc)..."
	@cd web-apps && pnpm run typecheck
	@echo "$(OK) Typecheck OK"

# ─── Full validation ───────────────────────────────────────────────────────────
validate: ## Full CI validation (lint + typecheck + tests + coverage + build)
	@echo ""
	@echo "$(BOLD)╔══════════════════════════════════════════════╗$(RESET)"
	@echo "$(BOLD)║       QuartierConnect — CI validation        ║$(RESET)"
	@echo "$(BOLD)╚══════════════════════════════════════════════╝$(RESET)"
	@echo ""
	@echo "$(BOLD)  1/8  Lint (4 components)$(RESET)"
	@make lint
	@echo ""
	@echo "$(BOLD)  2/8  Typecheck TypeScript$(RESET)"
	@make typecheck
	@echo ""
	@echo "$(BOLD)  3/8  API unit tests + coverage$(RESET)"
	@make test-cov
	@echo ""
	@echo "$(BOLD)  4/8  API E2E tests$(RESET)"
	@make test-e2e
	@echo ""
	@echo "$(BOLD)  5/8  Web E2E tests (Playwright)$(RESET)"
	@make test-e2e-web
	@echo ""
	@echo "$(BOLD)  6/8  Desktop tests (JUnit)$(RESET)"
	@make test-desktop
	@echo ""
	@echo "$(BOLD)  7/8  DSL tests (pytest)$(RESET)"
	@make test-dsl
	@echo ""
	@echo "$(BOLD)  8/8  Full prod build$(RESET)"
	@make build-api build-web build-dsl
	@echo ""
	@echo "$(BOLD)$(GREEN)╔══════════════════════════════════════════════╗$(RESET)"
	@echo "$(BOLD)$(GREEN)║          ✓  All validations passed           ║$(RESET)"
	@echo "$(BOLD)$(GREEN)╚══════════════════════════════════════════════╝$(RESET)"
	@echo ""

validate-fast: ## Quick validation (lint + typecheck + unit tests only, no build)
	@echo "$(BOLD)  Quick validation$(RESET)"
	@make lint
	@make typecheck
	@make test
	@echo "$(OK) $(BOLD)Quick validation OK$(RESET)"

# ─── Docker ────────────────────────────────────────────────────────────────────
COMPOSE := docker compose -f docker/docker-compose.yml --env-file .env

docker-up: ## Start the 9 Docker services (Caddy + API + Client + Admin + Docs user + Docs dev + MongoDB + PostgreSQL + Neo4j)
	@echo "$(RUN) Starting Docker services..."
	@$(COMPOSE) up -d
	@echo ""
	@echo "$(OK) Services up:"
	@echo "    Client  → http://localhost"
	@echo "    Admin   → http://localhost/admin"
	@echo "    API     → http://localhost/api/docs"

docker-up-build: ## Start the Docker services, rebuilding images
	@echo "$(RUN) Rebuild + start..."
	@$(COMPOSE) up -d --build
	@echo "$(OK) Services rebuilt and started"

docker-down: ## Stop all Docker services
	@echo "$(RUN) Stopping services..."
	@$(COMPOSE) down
	@echo "$(OK) Services stopped"

docker-logs: ## Tail live logs (all services)
	@$(COMPOSE) logs -f

docker-logs-api: ## Tail the API logs only
	@$(COMPOSE) logs -f api

docker-reset: ## Full reset: stop + drop volumes + rebuild (⚠️ data loss)
	@echo "$(YELLOW)⚠  Dropping every Docker volume (data loss)$(RESET)"
	@read -p "Confirm? [y/N] " CONFIRM; [ "$$CONFIRM" = "y" ] || exit 1
	@$(COMPOSE) down -v
	@$(COMPOSE) up -d --build
	@echo "$(OK) Full reset done"

# ─── Seed & demo data ──────────────────────────────────────────────────────────
db-migrate: ## Apply the Drizzle migrations to PostgreSQL
	@echo "$(RUN) Drizzle migrations (PostgreSQL)..."
	@cd api && DATABASE_URL=$$(grep ^POSTGRES_URL ../.env | cut -d= -f2-) \
	           pnpm exec drizzle-kit migrate
	@echo "$(OK) PostgreSQL migrations applied"

seed: db-migrate seed-demo seed-neo4j ## Full seed: migrations + demo accounts + Neo4j graph

seed-demo: ## Create the 72 demo accounts in PostgreSQL + MongoDB
	@echo "$(RUN) Demo seed (72 accounts)..."
	@cd api && npx tsx ../scripts/seed-demo.ts
	@echo "$(OK) Accounts created — current TOTP code: make totp"

seed-neo4j: ## Populate Neo4j with nodes from MongoDB (neighborhoods, services, events)
	@echo "$(RUN) Seed Neo4j..."
	@cd api && NEO4J_URI=$$(grep ^NEO4J_URI ../.env | cut -d= -f2-) \
	           NEO4J_USER=$$(grep ^NEO4J_AUTH ../.env | cut -d= -f2- | cut -d/ -f1) \
	           NEO4J_PASSWORD=$$(grep ^NEO4J_AUTH ../.env | cut -d= -f2- | cut -d/ -f2) \
	           MONGO_URI=$$(grep ^MONGO_URI ../.env | cut -d= -f2-) \
	           NODE_PATH=./node_modules npx tsx ../scripts/seed-neo4j.ts
	@echo "$(OK) Neo4j graph populated"

totp: ## Print the current TOTP code for each demo login (EMAIL=... for one)
	@cd api && NODE_PATH=./node_modules npx tsx ../scripts/totp.ts

# ─── Git hooks ───────────────────────────────────────────────────────────────
hooks: ## Enable the shared git hooks (pre-commit) — run once per clone
	@git config core.hooksPath .githooks
	@chmod +x .githooks/* 2>/dev/null || true
	@echo "$(OK) Hooks enabled (core.hooksPath = .githooks)"

# ─── Installation ──────────────────────────────────────────────────────────────
install: install-api install-web install-dsl ## Install every dependency (pnpm + uv)
	@echo "$(OK) All dependencies installed"

install-api: ## Install the API dependencies (pnpm)
	@echo "$(RUN) pnpm install (api)..."
	@cd api && pnpm install

install-web: ## Install the web monorepo dependencies (pnpm workspaces)
	@echo "$(RUN) pnpm install (web-apps)..."
	@cd web-apps && pnpm install

install-dsl: ## Install the Python DSL dependencies (uv)
	@echo "$(RUN) uv sync (dsl)..."
	@cd dsl && uv sync

# ─── Cleanup ───────────────────────────────────────────────────────────────────
clean: ## Remove build artifacts (dist/, target/, __pycache__, coverage)
	@echo "$(RUN) Cleaning build artifacts..."
	@rm -rf api/dist api/coverage
	@rm -rf web-apps/apps/client/dist web-apps/apps/admin/dist
	@rm -rf desktop-app/target
	@find dsl -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
	@find dsl -name "parser.out" -o -name "parsetab.py" | xargs rm -f 2>/dev/null || true
	@make clean-modules
	@echo "$(OK) Cleanup done"

clean-modules: ## Remove node_modules (api + web-apps)
	@echo "$(RUN) Removing node_modules..."
	@rm -rf api/node_modules
	@rm -rf web-apps/node_modules
	@rm -rf web-apps/apps/client/node_modules
	@rm -rf web-apps/apps/admin/node_modules
	@echo "$(OK) node_modules removed"