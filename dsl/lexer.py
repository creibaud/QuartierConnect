import ply.lex as lex

reserved = {
    "FIND": "FIND",
    "WHERE": "WHERE",
    "AND": "AND",
    "OR": "OR",
    "LIMIT": "LIMIT",
    "COUNT": "COUNT",
    "IN": "IN",
    "LIKE": "LIKE",
}

tokens = [
    "IDENTIFIER",
    "STRING",
    "NUMBER",
    "EQ",
    "NEQ",
    "GT",
    "GTE",
    "LT",
    "LTE",
    "LPAREN",
    "RPAREN",
    "COMMA",
    "DOT",
] + list(reserved.values())

t_EQ = r"="
t_NEQ = r"!="
t_GT = r">"
t_GTE = r">="
t_LT = r"<"
t_LTE = r"<="
t_LPAREN = r"\("
t_RPAREN = r"\)"
t_COMMA = r","
t_DOT = r"\."
t_ignore = " \t\n"


def t_STRING(t):
    r'"([^"\\]|\\.)*"|\'([^\'\\]|\\.)*\''
    t.value = t.value[1:-1]
    return t


def t_NUMBER(t):
    r"\d+(\.\d+)?"
    t.value = float(t.value) if "." in t.value else int(t.value)
    return t


def t_IDENTIFIER(t):
    r"[a-zA-Z_][a-zA-Z0-9_]*"
    t.type = reserved.get(t.value.upper(), "IDENTIFIER")
    if t.type != "IDENTIFIER":
        t.value = t.value.upper()
    return t


def t_error(t):
    raise SyntaxError(f"Illegal character '{t.value[0]}' at position {t.lexpos}")


lexer = lex.lex()
