const KEYWORDS = new Set([
    "FIND",
    "COUNT",
    "WHERE",
    "AND",
    "OR",
    "LIMIT",
    "ORDER",
    "BY",
    "ASC",
    "DESC",
]);

export interface Token {
    type: "ws" | "string" | "number" | "keyword" | "ident" | "op" | "punct";
    value: string;
}

export function tokenizeQuery(src: string): Token[] {
    const tokens: Token[] = [];
    const re =
        /(\s+)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\d+(?:\.\d+)?)|([A-Za-z_][A-Za-z0-9_]*)|([=<>!]+)|(.)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null) {
        if (m[1]) tokens.push({ type: "ws", value: m[1] });
        else if (m[2]) tokens.push({ type: "string", value: m[2] });
        else if (m[3]) tokens.push({ type: "number", value: m[3] });
        else if (m[4])
            tokens.push({
                type: KEYWORDS.has(m[4].toUpperCase()) ? "keyword" : "ident",
                value: m[4],
            });
        else if (m[5]) tokens.push({ type: "op", value: m[5] });
        else tokens.push({ type: "punct", value: m[6] });
    }
    return tokens;
}

export const TOKEN_CLASS: Record<Token["type"], string> = {
    ws: "",
    keyword: "text-primary font-semibold",
    string: "text-emerald-600 dark:text-emerald-400",
    number: "text-sky-600 dark:text-sky-400",
    op: "text-muted-foreground",
    punct: "text-muted-foreground",
    ident: "text-foreground",
};
