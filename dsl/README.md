# DSL — Langage de requête MongoDB

Micro-langage de requête permettant aux administrateurs d'interroger les
collections MongoDB sans écrire de code. Il est écrit en **Python** avec
**PLY** (lexer + parser LALR(1)) et invoqué depuis l'API NestJS via le pont
**pythonia** (`POST /dsl/query`, rôle `admin` requis).

## Pipeline

```
texte → lexer.py → parser.py (LALR) → compiler.py (liste blanche) → JSON
```

- `lexer.py` — découpe la requête en tokens (`FIND`, `IDENTIFIER`, `WHERE`, `STRING`…)
- `parser.py` — grammaire LALR(1) produisant un AST (`type`, `collection`, `filter`, `limit`)
- `compiler.py` — valide la collection contre la liste blanche et renvoie l'AST
- `main.py` — point d'entrée appelé depuis Node.js, sérialise le résultat en JSON ;
  l'exécution MongoDB proprement dite est réalisée côté API

## Syntaxe

Deux verbes : `FIND` (documents) et `COUNT` (entier). Les mots réservés
(`FIND`, `WHERE`, `AND`, `OR`, `LIMIT`, `COUNT`, `LIKE`) sont insensibles à la
casse. Opérateurs : `=`, `!=`, `>`, `>=`, `<`, `<=`, `LIKE` (regex insensible
à la casse).

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

## Garde-fous

- Liste blanche stricte : `incidents`, `neighborhoods`, `services`, `events`, `users`
- Lecture seule : `FIND` et `COUNT` uniquement, aucune opération destructive
- Longueur de requête limitée (validée côté API) et `limit` plafonné
- Une collection hors liste blanche est rejetée avant tout accès à la base

## Commandes

Les dépendances sont gérées par [uv](https://docs.astral.sh/uv/) :

```bash
uv sync                       # installer les dépendances (crée .venv)
uv run pytest                 # lancer les tests (dsl/tests/)
uv run ruff check .           # lint
uv run ruff format .          # format
uv run python main.py "FIND incidents WHERE status = 'open'"   # test manuel
```

Depuis la racine du dépôt : `make install-dsl`, `make test-dsl`, `make lint-dsl`.

L'API consomme ce répertoire via les variables `PYTHON_BIN`
(`./dsl/.venv/bin/python`) et `DSL_PATH` (`./dsl`) définies dans `.env`.

Documentation détaillée : `docs/DSL.md` et la page « Le DSL » du site
développeur (`http://localhost/dev`).
