# QuartierConnect

Neighborhood community platform — ESGI 3AL2 · Stage 4 (95%)

> **Final submission**: 19 July 2026 · **Instructor**: Frédéric SANANES
> **v0.2.0** · **736 automated tests** · 7 Docker containers · 3 databases · 4 surfaces

---

## Prerequisites

- Docker + Docker Compose
- Make
- Node.js 20+ (for seeding)
- Java 21 (for the desktop app)
- oathtool (`sudo apt install oathtool`) or Google Authenticator

## Quick start

```bash
# 1. Configure the environment
cp .env.example .env
# Edit .env: POSTGRES_PASSWORD, MONGO_ROOT_PASSWORD, JWT_SECRET, NEO4J_AUTH

# 2. Start the 7 Docker services
make docker-up

# 3. Create the demo accounts + populate Neo4j
make seed
```

| Surface               | URL                       |
| --------------------- | ------------------------- |
| **Resident client**   | http://localhost          |
| **Admin back-office** | http://localhost/admin    |
| **API docs (Scalar)** | http://localhost/api/docs |
| **Neo4j Browser**     | http://localhost:7474     |

## Demo accounts

| Email         | Password     | Role      | TOTP               |
| ------------- | ------------ | --------- | ------------------ |
| alice@demo.fr | Demo1234!    | resident  | `JBSWY3DPEHPK3PXP` |
| bob@demo.fr   | Demo1234!    | moderator | `JBSWY3DPEHPK3PXP` |
| admin@demo.fr | Demo1234!    | admin     | `JBSWY3DPEHPK3PXP` |

```bash
make totp
# Or: oathtool --totp --base32 JBSWY3DPEHPK3PXP
```

## Local development

```bash
make dev              # API + client + admin in parallel (hot reload)
make dev-api          # API only (port 5000)
make dev-client       # React client (port 3000)
make dev-admin        # React admin (port 3001)
make dev-desktop      # JavaFX (javafx:run)
```

## Tests

```bash
make test             # Unit API (260) + Web shared hooks (73) + Desktop (139) + DSL (21)
make test-cov         # + coverage report (stmts 95.7%, branches 86.1%)
make test-e2e         # E2E API Supertest (148) — requires Docker
make test-e2e-web     # E2E Playwright (79) — requires apps running
make validate         # Everything in sequence: lint + typecheck + tests + build
```

## Format

```bash
make format           # Formats all 4 components (Prettier + Ruff)
make format-api       # NestJS API only
make format-web       # Web monorepo only
make format-desktop   # Desktop Java (compile -q)
make format-dsl       # Python DSL (ruff format)
```

## Build

```bash
make build            # All components
make build-desktop    # Fat JAR (~25 MB)
java -jar desktop-app/target/quartierconnect-desktop.jar
```

## Docker

```bash
make docker-up        # Start
make docker-down      # Stop
make docker-reset     # Full reset (⚠️ removes volumes)
make docker-logs      # Real-time logs
make status           # Service status
```

## Documentation

| Document                                               | Contents                                                  |
| ------------------------------------------------------ | --------------------------------------------------------- |
| [docs/RAPPORT-TECHNIQUE.md](docs/RAPPORT-TECHNIQUE.md) | Full report for the defense — all the algorithms           |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)           | Mermaid diagrams — modules, flows, security                |
| [docs/DATABASE.md](docs/DATABASE.md)                   | PostgreSQL, MongoDB, Neo4j, SQLite schemas                 |
| [docs/SECURITY.md](docs/SECURITY.md)                   | Argon2id, TOTP, JWT, SSO, SHA-256, GDPR                    |
| [docs/TEST.md](docs/TEST.md)                           | QA report — 736 tests, coverage, strategy                  |
| [docs/DSL.md](docs/DSL.md)                             | PLY micro-language — grammar, pipeline, security            |
| [docs/GUIDE-SOUTENANCE.md](docs/GUIDE-SOUTENANCE.md)   | Demo scenarios, Q&A, key figures                           |
| [docs/API.md](docs/API.md)                             | Full reference for the 50+ endpoints                       |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)               | VPS deployment + Caddy HTTPS                                |

## Stack

| Layer       | Technology                                                                 |
| ----------- | -------------------------------------------------------------------------- |
| **API**     | NestJS 11, TypeScript, Drizzle ORM, Mongoose, JWT HS256, argon2, speakeasy |
| **Client**  | React 19, TanStack Router/Query/Form, Shadcn/ui, Tailwind v4               |
| **Admin**   | React 19 (same stack), DSL editor, Mermaid                                 |
| **Desktop** | JavaFX 21, Maven Shade JAR, SQLite JDBC, java.net.http                     |
| **Databases** | PostgreSQL 16, MongoDB 7, Neo4j 5, SQLite 3                              |
| **Proxy**   | Caddy 2 (automatic Let's Encrypt HTTPS)                                    |
| **CI/CD**   | GitHub Actions (lint + test + build), Turbo monorepo                       |
| **DSL**     | Python PLY + pythonia bridge                                               |
