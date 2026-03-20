# DSL - QuartierConnect

Langage de domaine spécifique (Domain Specific Language) du projet QuartierConnect, implémenté en Python avec [PLY](https://ply.readthedocs.io/) (Python Lex-Yacc).

## Stack technique

- **Langage** : Python 3.12+
- **Gestionnaire de paquets** : [uv](https://docs.astral.sh/uv/)
- **Parser** : PLY (lex + yacc)
- **Tests** : pytest + pytest-cov
- **Linting** : ruff

## Structure

```text
dsl/
├── src/
│   └── dsl/
│       ├── __init__.py       # Point d'entrée du module
│       ├── __main__.py       # Exécution en ligne de commande
│       ├── lexer.py          # Analyseur lexical (tokens)
│       ├── parser.py         # Analyseur syntaxique (grammaire)
│       ├── grammar.py        # Règles de grammaire
│       ├── nodes.py          # Noeuds de l'AST
│       └── py.typed          # Marqueur de typage
├── tests/
│   └── test_dsl.py           # Tests unitaires
└── pyproject.toml
```

## Prérequis

- Python 3.12+
- [uv](https://docs.astral.sh/uv/)

## Installation

```bash
uv sync
```

## Utilisation

```bash
# Exécuter le module
uv run python -m dsl
```

## Tests

```bash
# Depuis ce dossier
uv run pytest

# Depuis la racine du projet
make test-dsl

# En mode watch (sans couverture)
make test-dsl-watch
```

## Développement

```bash
# Activer l'environnement virtuel
source .venv/bin/activate

# Linter
uv run ruff check .

# Formatter
uv run ruff format .
```
