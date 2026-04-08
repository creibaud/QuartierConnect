import pytest
from compiler import compile_query


def test_find_simple():
    result = compile_query("FIND incidents")
    assert result["type"] == "find"
    assert result["collection"] == "incidents"
    assert result["filter"] == {}
    assert result["limit"] is None


def test_find_where_eq():
    result = compile_query('FIND incidents WHERE status = "open"')
    assert result["filter"] == {"status": "open"}


def test_find_where_and():
    result = compile_query(
        'FIND incidents WHERE status = "open" AND neighborhoodId = "nbh-1"'
    )
    assert result["filter"]["status"] == "open"
    assert result["filter"]["neighborhoodId"] == "nbh-1"


def test_find_with_limit():
    result = compile_query("FIND incidents LIMIT 5")
    assert result["limit"] == 5


def test_find_where_limit():
    result = compile_query('FIND services WHERE category = "health" LIMIT 10')
    assert result["filter"] == {"category": "health"}
    assert result["limit"] == 10


def test_count_simple():
    result = compile_query("COUNT incidents")
    assert result["type"] == "count"
    assert result["collection"] == "incidents"
    assert result["filter"] == {}


def test_count_where():
    result = compile_query('COUNT incidents WHERE status = "open"')
    assert result["type"] == "count"
    assert result["filter"] == {"status": "open"}


def test_numeric_condition():
    result = compile_query("FIND events WHERE capacity > 100")
    assert result["filter"] == {"capacity": {"$gt": 100}}


def test_neq_condition():
    result = compile_query('FIND users WHERE role != "banned"')
    assert result["filter"] == {"role": {"$ne": "banned"}}


def test_like_condition():
    result = compile_query('FIND neighborhoods WHERE name LIKE "Paris"')
    assert result["filter"] == {"name": {"$regex": "Paris", "$options": "i"}}


def test_unknown_collection_raises():
    with pytest.raises(ValueError, match="Unknown collection"):
        compile_query("FIND unknown_table")


def test_syntax_error_raises():
    with pytest.raises(SyntaxError):
        compile_query("FIND")


def test_find_where_or():
    result = compile_query(
        'FIND incidents WHERE status = "open" OR status = "in_progress"'
    )
    assert result["filter"] == {"$or": [{"status": "open"}, {"status": "in_progress"}]}


def test_syntax_error_unexpected_token():
    with pytest.raises(SyntaxError):
        compile_query("FIND incidents WHERE WHERE")
