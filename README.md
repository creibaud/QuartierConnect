# QuartierConnect

Neighborhood community platform — ESGI 3AL2 · Stage 4 (95%)

> **Final submission**: 19 July 2026 · **Instructor**: Frédéric SANANES
> **v0.2.0** · **736 automated tests** · 7 Docker containers · 3 databases · 4 surfaces

QuartierConnect connects residents of a neighborhood: report incidents, offer and
find services, organize events, vote, exchange points, and chat in real time.
It ships four surfaces from one monorepo:

| Surface              | Stack                          | What it is                                      |
| -------------------- | ------------------------------ | ----------------------------------------------- |
| **Resident client**  | React 19                       | The app residents use day to day                |
| **Admin back-office**| React 19 + DSL editor          | Moderation, management, MongoDB query console   |
| **REST API**         | NestJS 11                      | 60+ endpoints, JWT + TOTP, WebSocket            |
| **Desktop client**   | JavaFX 21                      | Offline-first companion app (SQLite), plugins   |

---

## Prerequisites

Install these once. The Docker quick start needs the first four; the rest are for
local development, the desktop app, and the DSL.

| Tool                     | Why                                          | Install                                                   |
| ------------------------ | -------------------------------------------- | -------------------------------------------------------- |
| **Docker + Compose**     | Runs the 7 services                          | https://docs.docker.com/get-docker/                      |
| **GNU Make**             | Task runner (every command below)            | `sudo apt install make`                                  |
| **Node.js 20+ & pnpm 9** | API + web apps + seed scripts                | Node from nodejs.org, then `corepack enable` for pnpm    |
| **oathtool**             | Generates the TOTP codes for demo login      | `sudo apt install oathtool` (or any authenticator app)   |
| **uv**                   | Python package manager — runs the DSL        | https://docs.astral.sh/uv/ (`curl -LsSf … \| sh`)        |
| **Java 21**              | Desktop app (Maven ships as `./mvnw`)        | Temurin / your distro's `openjdk-21`                     |

Run `make help` at any time to list every available command.

---

## First-time setup

From a fresh clone to a running stack with demo data:

```bash
# 1. Configure the environment (see "Environment variables" below)
cp .env.example .env
nano .env                 # set the 4 secrets

# 2. Install host dependencies (pnpm workspaces + the DSL Python venv)
make install              # api + web-apps (pnpm) + dsl (uv sync)

# 3. (contributors only) enable the shared pre-commit hooks
make hooks

# 4. Start the 7 Docker services
make docker-up

# 5. Create the demo accounts and populate Neo4j
make seed                 # needs step 2: the seed runs on the host via ts-node
```

Then open the surfaces:

| Surface               | URL                       |
| --------------------- | ------------------------- |
| **Resident client**   | http://localhost          |
| **Admin back-office** | http://localhost/admin    |
| **API docs (Scalar)** | http://localhost/api/docs |
| **Neo4j Browser**     | http://localhost:7474     |

> First boot pulls and builds images, so `make docker-up` can take a few minutes.
> Check progress with `make status` and `make docker-logs`.

---

## Environment variables

`.env.example` is the template. Four values must be set before the stack will run
(everything else has sane local defaults):

| Variable               | How to set it                                                        |
| ---------------------- | ------------------------------------------------------------------- |
| `JWT_SECRET`           | `openssl rand -base64 32` — signs the JWT access/refresh tokens      |
| `MONGO_ROOT_PASSWORD`  | A strong password — **also update the password inside `MONGO_URI`**  |
| `POSTGRES_PASSWORD`    | A strong password — **also update the password inside `POSTGRES_URL`** |
| `NEO4J_AUTH`           | `neo4j/<password>` — **keep `NEO4J_USER` / `NEO4J_PASSWORD` in sync** |

```bash
# Generate a secret quickly:
openssl rand -base64 32
```

The remaining variables (`PYTHON_BIN`, `DSL_PATH`, `DEMO_TOTP_SECRET`,
`LOGIN_RATE_LIMIT`, `CORS_ORIGINS`) work out of the box for local development.
`PYTHON_BIN` points at `./dsl/.venv/bin/python`, which `make install` creates.

---

## Demo accounts

All three accounts use password `Demo1234!` and the same demo TOTP secret.

| Email         | Password  | Role      | TOTP secret        |
| ------------- | --------- | --------- | ------------------ |
| alice@demo.fr | Demo1234! | resident  | `JBSWY3DPEHPK3PXP` |
| bob@demo.fr   | Demo1234! | moderator | `JBSWY3DPEHPK3PXP` |
| admin@demo.fr | Demo1234! | admin     | `JBSWY3DPEHPK3PXP` |

Login requires a 6-digit TOTP code (valid 30s). Generate one:

```bash
make totp
# Or: oathtool --totp --base32 JBSWY3DPEHPK3PXP
```

---

## Local development

Hot-reload dev servers, outside Docker (databases still come from `make docker-up`):

```bash
make dev              # API + client + admin in parallel
make dev-api          # API only        (port 5000)
make dev-client       # React client    (port 3000)
make dev-admin        # React admin      (port 3001)
make dev-desktop      # JavaFX desktop   (./mvnw javafx:run)
```

---

## Tests

```bash
make test             # All unit tests: API (261) + Web hooks + Desktop (139) + DSL
make test-cov         # API unit tests + coverage report (stmts 95.7%, branches 86.1%)
make test-e2e         # API E2E (Supertest)      — prerequisite: make docker-up
make test-e2e-web     # Web E2E (Playwright)     — prerequisite: make dev + make docker-up
make validate         # Full CI sequence: lint + typecheck + tests + coverage + build
make validate-fast    # lint + typecheck + unit tests only (no build, no E2E)
```

> `make test` needs nothing running. The E2E targets need live services — read the
> hint each target prints. The first Playwright run downloads a browser (slow once).

---

## Build

```bash
make build            # All components
make build-desktop    # Fat JAR (~25 MB) → desktop-app/target/quartierconnect-desktop.jar
java -jar desktop-app/target/quartierconnect-desktop.jar   # run the built JAR
```

---

## Docker

```bash
make docker-up        # Start the 7 services
make docker-down      # Stop
make docker-reset     # Full reset (⚠️ removes volumes — all data lost)
make docker-logs      # Real-time logs (all services)
make docker-logs-api  # Real-time logs (API only)
make status           # Service status + a quick API unit-test check
```

---

## Troubleshooting

| Symptom                                   | Fix                                                                       |
| ----------------------------------------- | ------------------------------------------------------------------------ |
| `make docker-up` hangs or a port is busy  | `make status`, then `make docker-logs`. Ports used: 80, 443, 5000, 5432, 27017, 7474, 7687 (and 3000/3001 in dev). |
| `make seed` fails or hangs                | Run `make install` first (the seed runs on the host via `ts-node`) and confirm services are healthy with `make status`. |
| API not reachable at `/api`               | `make docker-logs-api` to read the API logs.                             |
| Login rejects a valid-looking TOTP        | The code is time-based (30s window). Check your clock and regenerate with `make totp`. |
| DSL queries error in the admin console    | Ensure `make install` (a.k.a. `make install-dsl`) created `dsl/.venv`; `PYTHON_BIN` must point at it. |
| Need a clean slate                        | `make docker-reset` rebuilds from scratch (⚠️ wipes all volumes).        |

---

## Project layout

```
api/          NestJS 11 API — auth (JWT+TOTP), REST, WebSocket, MongoDB DSL bridge
web-apps/     Turbo monorepo — apps/client, apps/admin, packages/{shared,ui}
dsl/          Python PLY micro-language (the MongoDB query DSL)
desktop-app/  JavaFX 21 desktop client — offline-first (SQLite), plugin system
docker/       docker-compose + Caddy reverse proxy (Let's Encrypt HTTPS)
scripts/      Seed (demo accounts, Neo4j) + ops helpers (smoke test, rollback)
docs/         Full functional + technical dossier (see table below)
```

---

## Documentation

| Document                                               | Contents                                                  |
| ------------------------------------------------------ | --------------------------------------------------------- |
| [docs/RENDU-31-05.md](docs/RENDU-31-05.md)             | Submission dossier — functional + technical, end to end   |
| [docs/RAPPORT-TECHNIQUE.md](docs/RAPPORT-TECHNIQUE.md) | Full report for the defense — all the algorithms          |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)           | Mermaid diagrams — modules, flows, security               |
| [docs/DATABASE.md](docs/DATABASE.md)                   | PostgreSQL, MongoDB, Neo4j, SQLite schemas                |
| [docs/SECURITY.md](docs/SECURITY.md)                   | Argon2id, TOTP, JWT, SSO, SHA-256, GDPR                   |
| [docs/TEST.md](docs/TEST.md)                           | QA report — 736 tests, coverage, strategy                 |
| [docs/DSL.md](docs/DSL.md)                             | PLY micro-language — grammar, pipeline, security          |
| [docs/GUIDE-SOUTENANCE.md](docs/GUIDE-SOUTENANCE.md)   | Demo scenarios, Q&A, key figures                          |
| [docs/API.md](docs/API.md)                             | Reference for the 50+ endpoints                           |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)               | VPS deployment + Caddy HTTPS                              |

---

## Stack

| Layer         | Technology                                                                 |
| ------------- | -------------------------------------------------------------------------- |
| **API**       | NestJS 11, TypeScript, Drizzle ORM, Mongoose, JWT HS256, argon2, speakeasy |
| **Client**    | React 19, TanStack Router/Query/Form, Shadcn/ui, Tailwind v4               |
| **Admin**     | React 19 (same stack), DSL editor, Mermaid                                 |
| **Desktop**   | JavaFX 21, Maven Shade JAR, SQLite JDBC, java.net.http                     |
| **Databases** | PostgreSQL 16, MongoDB 7, Neo4j 5, SQLite 3                                |
| **Proxy**     | Caddy 2 (automatic Let's Encrypt HTTPS)                                    |
| **CI/CD**     | GitHub Actions (lint + test + build), Turbo monorepo                       |
| **DSL**       | Python PLY + pythonia bridge                                               |
