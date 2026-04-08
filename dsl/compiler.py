from parser import parser


ALLOWED_COLLECTIONS = {
    "incidents",
    "neighborhoods",
    "services",
    "events",
    "users",
}


def compile_query(query_string: str) -> dict:
    """
    Compile a DSL query string into a MongoDB query dict.

    Returns:
        {
          "type": "find" | "count",
          "collection": str,
          "filter": dict,
          "limit": int | None,
        }

    Raises:
        SyntaxError: if the query is malformed
        ValueError: if the collection is not in the allowed list
    """
    ast = parser.parse(query_string)

    collection = ast.get("collection", "")
    if collection not in ALLOWED_COLLECTIONS:
        raise ValueError(
            f"Unknown collection '{collection}'. "
            f"Allowed: {', '.join(sorted(ALLOWED_COLLECTIONS))}"
        )

    return ast
