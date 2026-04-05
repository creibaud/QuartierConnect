.DEFAULT_GOAL := help

# ─── Infrastructure ────────────────────────────────────────────────────────────

up: ## Start all services
	docker compose up -d

up-dev: ## Start all services with development configuration (hot reload)
	docker compose -f docker-compose.dev.yml up -d --build

down: ## Stop all services
	docker compose down

down-dev: ## Stop all services and remove volumes (development)
	docker compose -f docker-compose.dev.yml down -v

build: ## Build all Docker images
	docker compose build

rebuild: ## Rebuild all images without cache
	docker compose build --no-cache

restart: ## Restart all services
	docker compose restart

ps: ## Show status of all containers
	docker compose ps

logs: ## Follow logs for all services
	docker compose logs -f

logs-%: ## Follow logs for a specific service (e.g. make logs-api)
	docker compose logs -f $*

# ─── Databases ─────────────────────────────────────────────────────────────────

db-up: ## Start only the databases
	docker compose up -d postgres mongodb neo4j

db-reset: ## Reset all databases (destroys all data)
	docker compose down -v
	docker compose up -d postgres mongodb neo4j

# ─── Development ───────────────────────────────────────────────────────────────

dev-api: ## Start API in watch mode (local)
	cd api && pnpm start:dev

dev-client: ## Start client in dev mode (local)
	cd web-apps && pnpm --filter client dev

dev-back-office: ## Start back-office in dev mode (local)
	cd web-apps && pnpm --filter back-office dev

dev-desktop: ## Start desktop app (JavaFX)
	cd desktop-app && ./mvnw clean javafx:run

# ─── Dependencies ──────────────────────────────────────────────────────────────

install: ## Install all dependencies
	cd api && pnpm install
	cd web-apps && pnpm install

# ─── Tests ─────────────────────────────────────────────────────────────────────

test: test-api test-desktop test-dsl ## Run all tests locally

test-api: ## Run API unit tests (local)
	cd api && pnpm test

test-api-cov: ## Run API tests with coverage (local)
	cd api && pnpm test:cov

test-api-e2e: ## Run API end-to-end tests (local, requires databases)
	cd api && pnpm test:e2e

test-desktop: ## Run desktop tests (Maven)
	cd desktop-app && ./mvnw test

test-dsl: ## Run DSL tests with coverage
	cd dsl && uv run pytest

test-dsl-watch: ## Run DSL tests in watch mode
	cd dsl && uv run pytest --no-cov -x

test-docker: ## Run all tests in isolated Docker environment (no hot reload)
	docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from api-test
	docker compose -f docker-compose.test.yml down -v

test-docker-unit: ## Run API unit tests in Docker
	docker compose -f docker-compose.test.yml run --rm api-unit

test-docker-e2e: ## Run API e2e tests in Docker with real databases
	docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from api-test postgres mongodb neo4j api-test
	docker compose -f docker-compose.test.yml down -v

test-docker-web: ## Run web-apps tests in Docker
	docker compose -f docker-compose.test.yml run --rm web-test

test-docker-clean: ## Remove test Docker volumes
	docker compose -f docker-compose.test.yml down -v --remove-orphans

# ─── Shells ────────────────────────────────────────────────────────────────────

shell-api: ## Open a shell in the API container
	docker compose exec api sh

shell-postgres: ## Open a psql shell
	docker compose exec postgres psql -U $${POSTGRES_USER:-quartierconnect} $${POSTGRES_DB:-quartierconnect}

shell-mongodb: ## Open a MongoDB shell
	docker compose exec mongodb mongosh -u $${MONGO_USER:-root} -p $${MONGO_PASSWORD:-password} --authenticationDatabase admin

shell-neo4j: ## Open a Neo4j Cypher shell
	docker compose exec neo4j cypher-shell -u $${NEO4J_USER:-neo4j} -p $${NEO4J_PASSWORD:-password}

# ─── Formatting ────────────────────────────────────────────────────────────────

format-api: ## Format API code (Prettier + ESLint)
	cd api && pnpm format

format-web: ## Format web-apps code (Prettier + ESLint)
	cd web-apps && pnpm format

format-dsl: ## Format DSL code (Ruff)
	cd dsl && uv run ruff format .

format-desktop: ## Format desktop code (Spotless)
	cd desktop-app && ./mvnw spotless:apply

format: format-api format-web format-dsl format-desktop ## Format all code

# ─── Help ──────────────────────────────────────────────────────────────────────

help: ## Show this help
	@echo ""
	@echo "QuartierConnect - Available commands:"
	@echo ""
	@grep -E '^[a-zA-Z_%\-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2}'
	@echo ""

.PHONY: up down build rebuild restart ps logs db-up db-reset \
        dev-api dev-client dev-back-office dev-desktop install \
        test test-api test-api-cov test-api-e2e test-desktop test-dsl test-dsl-watch \
        test-docker test-docker-unit test-docker-e2e test-docker-web test-docker-clean \
        shell-api shell-postgres shell-mongodb shell-neo4j \
        format-api format-web format-dsl format-desktop format help
