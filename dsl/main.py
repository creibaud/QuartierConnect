import json
from compiler import compile_query


def execute(query_string: str) -> str:
    """
    Entry point called from Node.js via pythonia.
    Returns the compiled query as a JSON string.

    Raises:
        SyntaxError: parse failure
        ValueError: unknown collection
    """
    result = compile_query(query_string)
    return json.dumps(result)


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print('Usage: python main.py "<query>"')
        sys.exit(1)

    try:
        print(execute(sys.argv[1]))
    except (SyntaxError, ValueError) as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)
