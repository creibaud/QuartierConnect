# QuartierConnect

Neighborhood community platform — ESGI 3AL2 · Final submission

> **Final submission**: 19 July 2026 · **Instructor**: Frédéric SANANES
> **v1.0.8** · **1,447 automated tests** · 9 Docker containers · 3 databases · 4 surfaces

**Live: <https://quartierconnect.duckdns.org>** — resident client at `/`,
back-office at `/admin`, user guide at `/aide`. Sign in with `alice@demo.fr`,
password `Demo1234!`, and the TOTP code from `docs/fiche-soutenance.pdf`.
The developer documentation (`/dev`) and the API reference (`/docs`, `/scalar`)
sit behind HTTP basic auth: a 401 there is expected, not a failure.

QuartierConnect connects residents of a neighborhood: report incidents, offer and
find services, organize events, vote, exchange points, and chat in real time.
It ships four surfaces from one monorepo:

| Surface              | Stack                          | What it is                                      |
| -------------------- | ------------------------------ | ----------------------------------------------- |
| **Resident client**  | React 19                       | The app residents use day to day                |
| **Admin back-office**| React 19 + DSL editor          | Moderation, management, MongoDB query console   |
| **REST API**         | NestJS 11                      | 88 endpoints, JWT + TOTP, WebSocket             |
| **Desktop client**   | JavaFX 21                      | Offline-first companion app (SQLite), plugins   |

---

## One-command install

On a machine with Docker, Docker Compose v2 and Git, everything installs and
starts on its own:

```bash
git clone <repository-url> QuartierConnect
cd QuartierConnect
make setup
```

`make setup`:

1. checks the prerequisites (Docker, running daemon, Docker Compose v2, Git)
   with explicit error messages;
2. generates `.env` from `.env.example` with random secrets
   (`openssl rand -hex 32`) — an existing `.env` is kept
   (`make setup SETUP_FORCE=1` to regenerate it);
3. builds and starts the 9 Docker services (`docker compose up -d --build`);
4. waits for the databases and the API to become healthy (healthchecks +
   `/health`, 5 minutes max);
5. imports the demo dataset (`deliverables/test-datasets/import-dataset.sh`
   if present, otherwise `make seed`).

It ends with a summary listing the URLs (client http://localhost, admin
http://localhost/admin, API docs http://localhost/api/docs), the demo accounts
(password `Demo1234!`, TOTP code via `make totp`) and the desktop client
command:

```bash
java -jar desktop-app/target/quartierconnect-desktop.jar
```

To produce the submission archive (full sources + desktop executable + test
datasets): `make dist` → everything lands in `dist/`.

---

## Prerequisites

Install these once. The Docker quick start needs the first four; the rest are for
local development, the desktop app, and the DSL.

| Tool                     | Why                                          | Install                                                   |
| ------------------------ | -------------------------------------------- | -------------------------------------------------------- |
| **Docker + Compose**     | Runs the 9 services                          | https://docs.docker.com/get-docker/                      |
| **GNU Make**             | Task runner (every command below)            | `sudo apt install make`                                  |
| **Node.js 22+ & pnpm 9** | API + web apps + seed scripts                | Node from nodejs.org, then `corepack enable` for pnpm    |
| **oathtool** *(optional)* | Only if you want codes without `make totp`  | `sudo apt install oathtool` (or any authenticator app)   |
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

# 4. Start the 9 Docker services
make docker-up

# 5. Create the demo accounts and populate Neo4j
make seed                 # needs step 2: the seed runs on the host via tsx
```

Then open the surfaces:

| Surface                 | URL                       |
| ----------------------- | ------------------------- |
| **Resident client**     | http://localhost          |
| **Admin back-office**   | http://localhost/admin    |
| **User help site**      | http://localhost/aide     |
| **Developer docs site** | http://localhost/dev ¹    |
| **API docs (Scalar)**   | http://localhost/api/docs ¹ |
| **Neo4j Browser**       | http://localhost:7474     |

> ¹ The developer docs and the Scalar reference sit behind Caddy basic auth.
> Credentials come from the `DOCS_AUTH_USER` / `DOCS_AUTH_HASH` environment
> variables (a development default is provided in `docker/docker-compose.yml`).

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

All three accounts use password `Demo1234!`. Each has its own TOTP secret: the
replay guard is keyed on `secret:token`, so accounts sharing a secret lock each
other out for the rest of the 30-second window.

| Email         | Password  | Role      | TOTP secret                        |
| ------------- | --------- | --------- | ---------------------------------- |
| alice@demo.fr | Demo1234! | resident  | `4PX635D55YS6JJV3NYIXKZPREIO6YIIV` |
| bob@demo.fr   | Demo1234! | moderator | `K7QM4TZBX2VNHR5CJWYD6LPS3AF4EGU2` |
| admin@demo.fr | Demo1234! | admin     | `P4WDGNQ7RJ25XKTCVBM3ZLHY6SFA4EDN` |

Login requires a 6-digit TOTP code (valid 30s). `make totp` prints one per
account:

```bash
make totp                     # one code per account
make totp EMAIL=bob@demo.fr   # just that one
```

Codes come from `scripts/seed/roster.ts`, the same source the seed writes to
the database, so a printed code always matches the account it names.

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
make test             # All unit tests: API (529) + Web (147) + Desktop (158) + DSL (21)
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
make docker-up        # Start the 9 services
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
| `make docker-up` hangs or a port is busy  | `make status`, then `make docker-logs`. Ports used: 80, 443, 3000-3003, 5000, 5432, 7474, 7687, 27017 (all bound to 127.0.0.1 except 80/443). |
| `make seed` fails or hangs                | Run `make install` first (the seed runs on the host via `tsx`) and confirm services are healthy with `make status`. |
| API not reachable at `/api`               | `make docker-logs-api` to read the API logs.                             |
| Login rejects a valid-looking TOTP        | The code is time-based (30s window). Check your clock and regenerate with `make totp`. |
| DSL queries error in the admin console    | Ensure `make install` (a.k.a. `make install-dsl`) created `dsl/.venv`; `PYTHON_BIN` must point at it. |
| Need a clean slate                        | `make docker-reset` rebuilds from scratch (⚠️ wipes all volumes).        |

---

## Project layout

```
api/          NestJS 11 API — auth (JWT+TOTP), REST, WebSocket, MongoDB DSL bridge
web-apps/     Turbo monorepo — apps/{client,admin,docs-user,docs-dev}, packages/{shared,ui}
dsl/          Python PLY micro-language (the MongoDB query DSL)
desktop-app/  JavaFX 21 desktop client — offline-first (SQLite), plugin system
docker/       docker-compose + Caddy reverse proxy (Let's Encrypt HTTPS)
scripts/      Seed (demo accounts, Neo4j) + ops helpers (smoke test, rollback)
docs/         Full functional + technical dossier (see table below)
```

---

## Documentation

### Online documentation sites

Two Fumadocs sites ship with the stack (started by `make docker-up`):

| Site                    | URL                    | Audience                                        |
| ----------------------- | ---------------------- | ----------------------------------------------- |
| **User help** (`/aide`) | http://localhost/aide  | Residents — public guides for every feature      |
| **Developer docs** (`/dev`) | http://localhost/dev | Contributors — architecture, DSL, tests, deploy |

The developer site and the Scalar API reference (http://localhost/api/docs) are
protected by Caddy basic auth: credentials are configured through the
`DOCS_AUTH_USER` / `DOCS_AUTH_HASH` environment variables (see
`docker/docker-compose.yml` for the development default).

### Written reports

The full technical documentation (architecture, databases, API, security, DSL,
plugins, tests, deployment) lives in the **`/dev`** site, and the user guides in
**`/aide`**, both in French and English. The submission documents are PDFs:

| Document                                                   | Contents                                          |
| ---------------------------------------------------------- | ------------------------------------------------- |
| [docs/synthese.pdf](docs/synthese.pdf)                     | Approach, split of the work, critical review      |
| [docs/rapport-technique.pdf](docs/rapport-technique.pdf)   | Technical report (mirrors the `/dev` site)        |
| [docs/manuel-utilisateur.pdf](docs/manuel-utilisateur.pdf) | User manual (printable mirror of the `/aide` site)|
| [docs/demo.pdf](docs/demo.pdf)                             | Demonstration script                              |
| [docs/fiche-soutenance.pdf](docs/fiche-soutenance.pdf)     | Live URL, demo accounts, TOTP QR codes            |
| [docs/presentation.pdf](docs/presentation.pdf)             | Defence slides                                    |
| [docs/Sujet du projet.pdf](docs/Sujet%20du%20projet.pdf)   | The assignment                                    |

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
