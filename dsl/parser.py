import ply.yacc as yacc
from lexer import tokens  # noqa: F401


def p_query_find(p):
    """query : FIND IDENTIFIER"""
    p[0] = {"type": "find", "collection": p[2].lower(), "filter": {}, "limit": None}


def p_query_find_where(p):
    """query : FIND IDENTIFIER WHERE conditions"""
    p[0] = {"type": "find", "collection": p[2].lower(), "filter": p[4], "limit": None}


def p_query_find_limit(p):
    """query : FIND IDENTIFIER LIMIT NUMBER"""
    p[0] = {"type": "find", "collection": p[2].lower(), "filter": {}, "limit": p[4]}


def p_query_find_where_limit(p):
    """query : FIND IDENTIFIER WHERE conditions LIMIT NUMBER"""
    p[0] = {"type": "find", "collection": p[2].lower(), "filter": p[4], "limit": p[6]}


def p_query_count(p):
    """query : COUNT IDENTIFIER"""
    p[0] = {"type": "count", "collection": p[2].lower(), "filter": {}}


def p_query_count_where(p):
    """query : COUNT IDENTIFIER WHERE conditions"""
    p[0] = {"type": "count", "collection": p[2].lower(), "filter": p[4]}


def p_conditions_and(p):
    """conditions : conditions AND condition"""
    p[0] = {**p[1], **p[3]}


def p_conditions_or(p):
    """conditions : conditions OR condition"""
    p[0] = {"$or": [p[1], p[3]]}


def p_conditions_single(p):
    """conditions : condition"""
    p[0] = p[1]


def p_condition_eq(p):
    """condition : IDENTIFIER EQ value"""
    p[0] = {p[1]: p[3]}


def p_condition_neq(p):
    """condition : IDENTIFIER NEQ value"""
    p[0] = {p[1]: {"$ne": p[3]}}


def p_condition_gt(p):
    """condition : IDENTIFIER GT value"""
    p[0] = {p[1]: {"$gt": p[3]}}


def p_condition_gte(p):
    """condition : IDENTIFIER GTE value"""
    p[0] = {p[1]: {"$gte": p[3]}}


def p_condition_lt(p):
    """condition : IDENTIFIER LT value"""
    p[0] = {p[1]: {"$lt": p[3]}}


def p_condition_lte(p):
    """condition : IDENTIFIER LTE value"""
    p[0] = {p[1]: {"$lte": p[3]}}


def p_condition_like(p):
    """condition : IDENTIFIER LIKE value"""
    p[0] = {p[1]: {"$regex": p[3], "$options": "i"}}


def p_value_string(p):
    """value : STRING"""
    p[0] = p[1]


def p_value_number(p):
    """value : NUMBER"""
    p[0] = p[1]


def p_value_identifier(p):
    """value : IDENTIFIER"""
    p[0] = p[1]


def p_error(p):
    if p:
        raise SyntaxError(f"Syntax error at '{p.value}'")
    raise SyntaxError("Unexpected end of input")


parser = yacc.yacc()
