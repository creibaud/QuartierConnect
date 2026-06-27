# Defence Guide — QuartierConnect

> **Date**: 19 July 2026 · **Instructor**: Frédéric SANANES · **Duration**: ~30 minutes

---

## Table of contents

1. [Pre-defence checklist](#1-pre-defence-checklist)
2. [Starting the demo](#2-starting-the-demo)
3. [Demonstration scenarios](#3-demonstration-scenarios)
4. [Likely questions and answers](#4-likely-questions-and-answers)
5. [Figures to know by heart](#5-figures-to-know-by-heart)

---

## 1. Pre-defence checklist

### The day before

```bash
# 1. Update dependencies
make install

# 2. Validate everything
make validate

# 3. Start the environment
make docker-up

# 4. Wait 30s for all services to start
sleep 30

# 5. Seed the demo data
make seed

# 6. Check access
curl http://localhost/api/health
# → {"status":"ok","timestamp":"2026-07-19T...","version":"0.1.3"}

# 7. Check Neo4j
# Go to http://localhost:7474 → MATCH (n) RETURN count(n)
# Should show > 0 nodes

# 8. Generate the demo TOTP code
make totp
```

### Defence day

- [ ] Docker started (`make docker-up`)
- [ ] Data seeded (`make seed`)
- [ ] TOTP code at hand (`make totp`)
- [ ] Browser with 3 tabs: client/:3000, admin/:3001, Scalar/docs
- [ ] oathtool installed or Authenticator on smartphone
- [ ] Desktop JAR downloadable or running (`java -jar target/quartierconnect-desktop.jar`)

---

## 2. Starting the demo

### Quick access

| Surface | URL | Account | Role |
|---------|-----|--------|------|
| Resident client | http://localhost | alice@demo.fr | resident |
| Admin | http://localhost/admin | admin@demo.fr | admin |
| Scalar API docs | http://localhost/api/docs | — | — |
| Neo4j Browser | http://localhost:7474 | neo4j/password | — |

**Password**: `Demo1234!` for all accounts
**TOTP code**: `oathtool --totp --base32 JBSWY3DPEHPK3PXP`

---

## 3. Demonstration scenarios

### Scenario 1 — Sign-up and MFA login (3 min)

1. Open http://localhost
2. Click "Sign up" → enter email + password
3. **Show the TOTP QR code** — explain RFC 6238
4. Scan with Google Authenticator → confirm the code
5. Log out → log back in with the TOTP code

**Points to highlight:**
- Argon2id for passwords (not bcrypt)
- JWT access 15min + refresh 7 days with rotation
- TOTP anti-replay (same code twice = rejected)

### Scenario 2 — Creating a neighbourhood (2 min)

1. Log in as admin (http://localhost/admin)
2. Go to "Neighbourhoods" → "Create a neighbourhood"
3. Draw a GeoJSON polygon on the map
4. Try to create a neighbourhood that overlaps → see the 409 error message
5. **Open Neo4j Browser** → MATCH (n:Neighborhood) RETURN n → see the created node

**Points to highlight:**
- MongoDB 2dsphere index for `$geoIntersects`
- Fire-and-forget sync to Neo4j (never blocks the API)

### Scenario 3 — Point transfer (2 min)

1. Log in as alice
2. Go to "Points" → current balance
3. Transfer 10 points to bob
4. Check that bob's balance has increased
5. **Open PgAdmin or explain** the `FOR UPDATE` transaction + ACID

**Points to highlight:**
- `SELECT FOR UPDATE` — exclusive lock
- PostgreSQL transaction — automatic rollback on error
- Minimum balance -10 (limited overdraft)

### Scenario 4 — Signing a contract (3 min)

1. Create a contract with alice as creator, bob as signatory
2. Log in as bob → sign with TOTP code
3. **Show the SHA-256 hash** in the response
4. Log in as alice → sign too
5. Status moves to "signed"

**Points to highlight:**
- SHA-256 of the content at creation → integrity
- TOTP required to sign → non-repudiation
- Unique hash per signature (content + userId + timestamp)

### Scenario 5 — Real-time messaging (2 min)

1. Open two tabs: alice and bob logged in
2. Create an alice ↔ bob conversation
3. Send a message from alice → appears immediately for bob
4. **Explain** Socket.io /messaging namespace, `conversation:{id}` rooms

**Points to highlight:**
- JWT verified on WebSocket connection
- `isParticipant` checked before `join_conversation`
- `server.to(room).emit()` — broadcast to participants

### Scenario 6 — Neo4j recommendations (2 min)

1. Log in as alice
2. Display the recommendations
3. **Open Neo4j Browser** → run the Cypher query from the report
4. Explain the `LIVES_IN`, `LOCATED_IN`, `HELD_IN` graph

**Points to highlight:**
- Real-time sync when entities are created
- Cypher UNION — services + events in the same neighbourhood

### Scenario 7 — DSL (2 min)

1. Go to "DSL" in React Admin
2. Type: `FIND incidents WHERE status = 'open' LIMIT 5`
3. Press Ctrl+Enter → results appear
4. Type: `FIND passwords` → "Unknown collection" error
5. Type: `FIND incidents WHERE status = 'open' OR status = 'in_progress'`

**Points to highlight:**
- PLY LALR(1) lexer/parser
- Security whitelist
- pythonia NestJS → Python bridge

### Scenario 8 — Desktop offline (3 min)

1. Run the JAR: `java -jar target/quartierconnect-desktop.jar`
2. Perform the SSO exchange from the web admin (http://localhost:3001) → log in to the desktop
3. **Cut the network** (or `docker pause api`)
4. Create an incident in the desktop → it appears locally
5. Bring the network back → incident synced to the API

**Points to highlight:**
- SQLite session persistence → no need to log in again
- `is_dirty` flag for the LWW sync
- `isReachable()` with a 3-second timeout

### Scenario 9 — Tests (1 min)

```bash
# In a visible terminal
make test
# → 236 tests pass in ~8s

make test-desktop
# → 63 JUnit tests pass

cd dsl && uv run pytest
# → 21 pytest tests pass
```

---

## 4. Likely questions and answers

**"Why three databases? That's too complex."**
> PostgreSQL for data that requires ACID transactions (points, auth) — we can't afford double spending or partial authentication. MongoDB for flexible documents with native GeoJSON (neighbourhoods with polygons) — PostgreSQL doesn't support `$geoIntersects` this way. Neo4j only for recommendations — graph traversals are its strength. Each database does one thing and does it well.

**"Argon2id vs bcrypt — why?"**
> bcrypt is limited to 72 bytes of input (long passwords silently truncated) and has no memory parameter. Argon2id won the Password Hashing Competition 2015 — its 64 MB memory cost makes GPU attacks impractical because you can't parallelise thousands of threads with 64 MB each.

**"Neo4j fire-and-forget — is that a problem if Neo4j goes down?"**
> In production, Neo4j is a recommendation feature — a Neo4j outage must not prevent creating a neighbourhood. We accept that recommendations may be temporarily absent. If Neo4j were a critical feature, we'd use a queue (Bull/RabbitMQ) with automatic retry. It's a deliberate architectural choice.

**"Your DSL is limited, why not MongoDB directly?"**
> The full MongoDB API allows destructive operations (`$where` with code execution, `deleteMany`, etc.). Our DSL is a controlled surface: FIND and COUNT only, 5 allowed collections, no write operations from the admin. It's a security decision.

**"TOTP replay attack — what if someone intercepts the code?"**
> The code is kept in memory for 90 seconds (covering the ±1 window of 30s). A second submission of the same code within that window returns `false` immediately. After 90s, the code has expired anyway (RFC 6238 window closed).

**"How do you handle the forced logout of a banned user?"**
> The role is checked on every token refresh. If an admin bans alice, her current access token remains valid for at most 15 minutes. On the next refresh, `role === 'banned'` is detected and `401 ACCOUNT_BANNED` is returned. The refresh token is also revoked. 15 minutes is acceptable — otherwise we'd need a blacklist in a Redis cache.

**"Your E2E tests, what exactly do they test?"**
> The Supertest E2E tests use the real databases (test MongoDB and PostgreSQL) with no mocks. `beforeAll` seeds via the API to start from a known state. We test end-to-end scenarios: sign-up → login → create → update → delete with verification of HTTP codes and real JSON responses.

---

## 5. Figures to know by heart

| Figure | Value |
|---------|--------|
| API unit tests | 236 |
| Web shared-hook tests (Vitest) | 73 |
| API E2E tests | 148 |
| Java JUnit tests | 63 |
| DSL pytest tests | 21 |
| Playwright tests | 79 |
| **Total tests** | **620** |
| API statements coverage | 95.7% |
| API branches coverage | 86.1% |
| JWT access token lifetime | 15 minutes |
| JWT refresh token lifetime | 7 days |
| SSO token TTL | 5 minutes (300s) |
| Minimum points balance | -10 |
| TOTP anti-replay TTL | 90 seconds |
| Rate limiting | 100 req / 15 min / IP |
| Allowed DSL collections | 5 |
| Docker containers | 7 |
| Databases | 3 (PostgreSQL, MongoDB, Neo4j) + 1 local (SQLite) |
| PostgreSQL tables | 4 (users, incidents, points_balances, points_transactions) |
| MongoDB collections | 9 (neighborhoods, services, events, contracts, conversations, messages, votes, communityVotes, documents, ssoTokens) |
| NestJS modules | 15 |
| Desktop JAR size | ~25 MB |
