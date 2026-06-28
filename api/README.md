# QuartierConnect — API

NestJS 11 REST API for the QuartierConnect platform: authentication (JWT + TOTP),
60+ endpoints, real-time messaging (WebSocket), and the MongoDB query DSL bridge.

Most commands are driven from the repo root `Makefile`. This README covers running
the API on its own. See the [root README](../README.md) for the full stack.

## Polyglot persistence

| Database       | Access layer  | Holds                                                    |
| -------------- | ------------- | ------------------------------------------------------- |
| **PostgreSQL** | Drizzle ORM   | users, incidents, points (ACID transfers), sync queue   |
| **MongoDB**    | Mongoose      | neighborhoods, services, events, messages, votes, docs  |
| **Neo4j**      | neo4j-driver  | social graph, recommendations                           |

## Run

```bash
# From the repo root — databases come from Docker:
make docker-up          # start MongoDB + PostgreSQL + Neo4j (+ the rest)
make dev-api            # API with hot reload on http://localhost:5000

# Or directly from this folder:
pnpm install
pnpm run start:dev
```

The API expects the root `.env` (see [`.env.example`](../.env.example)). The DSL
needs the Python venv created by `make install` (`PYTHON_BIN` points at it).

## API documentation

Interactive Scalar reference (auto-generated from the Swagger decorators):

- http://localhost/api/docs (via Caddy) or http://localhost:5000/docs (direct)

A static reference also lives in [`docs/API.md`](../docs/API.md).

## Tests

```bash
make test-api           # Unit tests (Jest)
make test-cov           # Unit tests + coverage (stmts 95.7%, branches 86.1%)
make test-e2e           # E2E (Supertest) — needs make docker-up
```

## Security notes

- Passwords: argon2id. MFA: TOTP (RFC 6238). Tokens: JWT HS256, 15 min access +
  rotating 7-day refresh; SSO one-time UUID tokens (5 min, single use).
- Input is validated at the boundary with `class-validator` DTOs + a global
  `ValidationPipe({ whitelist: true })`, and user-supplied values are coerced
  to strings before they reach Mongoose filters (no NoSQL operator injection).
- See [`docs/SECURITY.md`](../docs/SECURITY.md) for the full threat model.
