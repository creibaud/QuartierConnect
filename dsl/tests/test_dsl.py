from dsl import hello


def test_hello_returns_string() -> None:
    result = hello()

    assert isinstance(result, str)


def test_hello_content() -> None:
    result = hello()

    assert result == "Hello from dsl!"
