# Deployment Guide — QuartierConnect

---

## Prerequisites

| Tool | Minimum version |
|------|----------------|
| Docker | 24.0 |
| Docker Compose | v2 (plugin, not standalone) |
| Java | 21 (JDK, for building the desktop JAR) |
| Node.js | 20 |
| pnpm | 9 |
| Maven Wrapper | included (`./mvnw`) |

---

## Configuration

### 1. Copy the environment file

```bash
cp .env.example .env
```

### 2. Fill in required values

| Variable | Description | Example |
|----------|-------------|---------|
| `JWT_SECRET` | HS256 signing key — **minimum 32 characters** | `openssl rand -base64 32` |
| `JWT_ACCESS_EXPIRES_IN` | Access token TTL | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token TTL | `7d` |
| `MONGO_ROOT_USER` | MongoDB root username | `root` |
| `MONGO_ROOT_PASSWORD` | MongoDB root password | strong password |
| `MONGO_URI` | Full MongoDB connection string | `mongodb://root:<pw>@localhost:27017/quartierconnect?authSource=admin` |
| `POSTGRES_USER` | PostgreSQL username | `qc` |
| `POSTGRES_PASSWORD` | PostgreSQL password | strong password |
| `POSTGRES_DB` | PostgreSQL database name | `quartierconnect` |
| `POSTGRES_URL` | Full PostgreSQL connection string | `postgresql://qc:<pw>@localhost:5432/quartierconnect` |
| `NEO4J_URI` | Bolt URI | `bolt://localhost:7687` |
| `NEO4J_AUTH` | `user/password` format | `neo4j/<strong password>` |
| `LOGIN_RATE_LIMIT` | Max login attempts per IP per 15 min | `5` (prod), `100` (dev) |
| `CORS_ORIGINS` | Comma-separated allowed origins | `http://localhost,http://localhost:3000,http://localhost:3001` |

---

## Development — Start All Services

```bash
# Start all 7 containers (Caddy, client, admin, API, MongoDB, Neo4j, PostgreSQL)
docker compose -f docker/docker-compose.yml up -d

# Check container status
docker compose -f docker/docker-compose.yml ps

# View API logs
docker compose -f docker/docker-compose.yml logs -f api
```

### Start services individually (hot reload)

```bash
# API with hot reload
cd api && pnpm run start:dev

# All web apps in parallel (Turbo)
cd web-apps && pnpm run dev

# Client app only
cd web-apps && pnpm run dev --filter client

# Admin app only
cd web-apps && pnpm run dev --filter admin
```

---

## Production

```bash
docker compose -f docker/docker-compose.yml up -d --build
```

Caddy handles TLS termination automatically (via Let's Encrypt or a provided certificate). Ensure ports 80 and 443 are open on the host.

---

## Verify the Installation

After startup, check these URLs:

| Service | URL | Expected response |
|---------|-----|-------------------|
| Client app | `http://localhost:3000` | Login page |
| Admin app | `http://localhost:3001` | Admin login page |
| API health | `http://localhost:5000/health` | `{"status":"ok"}` |
| API docs | `http://localhost:5000/docs` | Scalar interactive docs |
| MongoDB | `localhost:27017` | Accessible from host (dev only) |
| PostgreSQL | `localhost:5432` | Accessible from host (dev only) |
| Neo4j browser | `http://localhost:7474` | Neo4j web UI |

---

## Demo Seed

Populate the database with demo users (TOTP secret: `JBSWY3DPEHPK3PXP`):

```bash
npx ts-node scripts/seed-demo.ts
```

Demo accounts:

| Email | Role | Password |
|-------|------|----------|
| `alice@demo.fr` | resident | `Demo1234!` |
| `bob@demo.fr` | moderator | `Demo1234!` |
| `admin@demo.fr` | admin | `Demo1234!` |

Generate a TOTP code for any demo account:

```bash
# Requires oathtool
oathtool --totp --base32 JBSWY3DPEHPK3PXP
```

---

## Build the Desktop JAR

```bash
cd desktop-app
./mvnw clean package -q
java -jar target/quartierconnect-desktop.jar
```

The fat JAR is approximately 25 MB and includes all dependencies (JavaFX, SQLite JDBC).

---

## Troubleshooting

### Port already in use

```bash
# Find the process using port 5000
lsof -i :5000
kill <PID>
```

Or change the port in `docker/docker-compose.yml` and update `CORS_ORIGINS`.

### MongoDB connection refused

Ensure the `mongo` container is healthy before the `api` container starts. The `docker-compose.yml` includes a `healthcheck` and `depends_on: condition: service_healthy`.

```bash
docker compose -f docker/docker-compose.yml logs mongo
```

### PostgreSQL migrations not applied

The API runs Drizzle migrations on startup. Check the API logs:

```bash
docker compose -f docker/docker-compose.yml logs api | grep -i drizzle
```

If the database is empty, run:

```bash
cd api && pnpm run db:migrate
```

### Neo4j authentication error

Ensure `NEO4J_AUTH` in `.env` matches the format `username/password` (e.g. `neo4j/mypassword`). The Neo4j container uses this value directly.

### TOTP code rejected

TOTP codes are time-based. Ensure the server clock is synchronised (NTP). The API accepts codes in a ±30-second window.

### Desktop JAR — JavaFX not found

Java 21 does not bundle JavaFX. The Maven Shade Plugin includes the JavaFX platform jars in the fat JAR. Ensure you are using the JAR produced by `./mvnw clean package`, not a raw class run.
