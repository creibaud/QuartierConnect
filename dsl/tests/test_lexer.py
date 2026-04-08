import pytest
from lexer import lexer


def tokenize(text):
    lexer.input(text)
    return [(t.type, t.value) for t in lexer]


def test_find_keyword():
    tokens = tokenize("FIND incidents")
    assert ("FIND", "FIND") in tokens
    assert ("IDENTIFIER", "incidents") in tokens


def test_reserved_keywords_case_insensitive():
    tokens = tokenize('find incidents where status = "open" limit 10')
    types = [t for t, _ in tokens]
    assert "FIND" in types
    assert "WHERE" in types
    assert "LIMIT" in types


def test_string_literal():
    tokens = tokenize('"hello world"')
    assert tokens[0] == ("STRING", "hello world")


def test_number_integer():
    tokens = tokenize("42")
    assert tokens[0] == ("NUMBER", 42)


def test_number_float():
    tokens = tokenize("3.14")
    assert tokens[0] == ("NUMBER", 3.14)


def test_operators():
    tokens = tokenize("= != > >= < <=")
    types = [t for t, _ in tokens]
    assert types == ["EQ", "NEQ", "GT", "GTE", "LT", "LTE"]


def test_illegal_character():
    with pytest.raises(SyntaxError):
        tokenize("@invalid")
