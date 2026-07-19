# DSL — MongoDB query language

A micro query language that lets administrators query MongoDB collections
without writing code. It is written in **Python** with **PLY** (lexer +
LALR(1) parser) and called from the NestJS API through the **pythonia**
bridge (`POST /dsl/query`, `admin` role required).

## Pipeline

```
text → lexer.py → parser.py (LALR) → compiler.py (whitelist) → JSON
```

- `lexer.py` — splits the query into tokens (`FIND`, `IDENTIFIER`, `WHERE`, `STRING`…)
- `parser.py` — LALR(1) grammar producing an AST (`type`, `collection`, `filter`, `limit`)
- `compiler.py` — checks the collection against the whitelist and returns the AST
- `main.py` — entry point called from Node.js, serializes the result to JSON;
  the MongoDB execution itself happens on the API side

## Syntax

Two verbs: `FIND` (documents) and `COUNT` (integer). Reserved words
(`FIND`, `WHERE`, `AND`, `OR`, `LIMIT`, `COUNT`, `LIKE`) are case-insensitive.
Operators: `=`, `!=`, `>`, `>=`, `<`, `<=`, `LIKE` (literal substring search,
case-insensitive — the value is escaped, no regex pattern ever reaches the
database).

```
FIND incidents
FIND incidents LIMIT 5
COUNT incidents
FIND incidents WHERE status = 'open'
FIND services WHERE type = 'free' AND category = 'gardening'
FIND services WHERE type = 'free' OR type = 'exchange'
FIND services WHERE title LIKE 'garden'
FIND events WHERE maxAttendees >= 50 LIMIT 10
```

## Safeguards

- Strict whitelist: `incidents`, `neighborhoods`, `services`, `events`, `users`
- Read-only: `FIND` and `COUNT` only, no destructive operation
- Query length capped (validated API-side) and `limit` capped at 100
  (a `FIND` without `LIMIT`, or with an excessive value, is truncated)
- Role scoping API-side: a moderator only sees their own neighborhood
  (incidents, services, events, users); only an admin queries all data
- A collection outside the whitelist is rejected before any database access

## Commands

Dependencies are managed by [uv](https://docs.astral.sh/uv/):

```bash
uv sync                       # install dependencies (creates .venv)
uv run pytest                 # run the tests (dsl/tests/)
uv run ruff check .           # lint
uv run ruff format .          # format
uv run python main.py "FIND incidents WHERE status = 'open'"   # manual check
```

From the repository root: `make install-dsl`, `make test-dsl`, `make lint-dsl`.

The API consumes this directory through the `PYTHON_BIN`
(`./dsl/.venv/bin/python`) and `DSL_PATH` (`./dsl`) variables set in `.env`.

Detailed documentation: the "Le DSL" page on the developer site
(`http://localhost/dev`).
