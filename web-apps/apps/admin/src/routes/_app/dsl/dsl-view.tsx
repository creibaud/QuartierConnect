import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

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

interface Token {
    type: "ws" | "string" | "number" | "keyword" | "ident" | "op" | "punct";
    value: string;
}

function tokenizeQuery(src: string): Token[] {
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

const TOKEN_CLASS: Record<Token["type"], string> = {
    ws: "",
    keyword: "text-primary font-semibold",
    string: "text-emerald-600 dark:text-emerald-400",
    number: "text-sky-600 dark:text-sky-400",
    op: "text-muted-foreground",
    punct: "text-muted-foreground",
    ident: "text-foreground",
};

/** Éditeur avec coloration syntaxique : un <pre> coloré aligné derrière un
 *  <textarea> au texte transparent (le caret et la saisie restent réels). */
export function QueryEditor({
    value,
    onChange,
    onKeyDown,
    placeholder,
}: {
    value: string;
    onChange: (v: string) => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    placeholder: string;
}) {
    const preRef = useRef<HTMLPreElement>(null);

    function syncScroll(e: React.UIEvent<HTMLTextAreaElement>) {
        if (preRef.current) {
            preRef.current.scrollTop = e.currentTarget.scrollTop;
            preRef.current.scrollLeft = e.currentTarget.scrollLeft;
        }
    }

    const shared =
        "min-h-48 w-full rounded-md p-3 font-mono text-sm leading-6 whitespace-pre";

    return (
        <div className="border-input bg-muted/40 relative flex-1 overflow-hidden rounded-md border">
            <pre
                ref={preRef}
                aria-hidden
                className={`${shared} pointer-events-none absolute inset-0 overflow-auto border-0`}
            >
                {tokenizeQuery(value).map((tok, i) => (
                    <span key={i} className={TOKEN_CLASS[tok.type]}>
                        {tok.value}
                    </span>
                ))}
                {"\n"}
            </pre>
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={onKeyDown}
                onScroll={syncScroll}
                placeholder={placeholder}
                wrap="off"
                spellCheck={false}
                maxLength={500}
                className={`${shared} caret-foreground relative resize-none overflow-auto border-0 bg-transparent text-transparent outline-none`}
            />
        </div>
    );
}

function isTabular(result: unknown): result is Record<string, unknown>[] {
    return (
        Array.isArray(result) &&
        result.length > 0 &&
        result.every(
            (r) => r !== null && typeof r === "object" && !Array.isArray(r),
        )
    );
}

function cellValue(v: unknown): string {
    if (v === null || v === undefined) return "—";
    if (typeof v === "object") return JSON.stringify(v);
    if (typeof v === "boolean") return v ? "true" : "false";
    return String(v);
}

function ResultTable({ rows }: { rows: Record<string, unknown>[] }) {
    const columns = Array.from(
        rows.reduce((set, row) => {
            Object.keys(row).forEach((k) => set.add(k));
            return set;
        }, new Set<string>()),
    ).slice(0, 12);

    return (
        <div className="max-h-[28rem] overflow-auto rounded-lg border">
            <table className="w-full text-left text-xs">
                <thead className="bg-muted text-muted-foreground sticky top-0">
                    <tr>
                        {columns.map((c) => (
                            <th
                                key={c}
                                className="px-3 py-2 font-medium whitespace-nowrap"
                            >
                                {c}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => (
                        <tr key={i} className="border-t">
                            {columns.map((c) => (
                                <td
                                    key={c}
                                    className="text-foreground max-w-[16rem] truncate px-3 py-2 font-mono"
                                    title={cellValue(row[c])}
                                >
                                    {cellValue(row[c])}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/** Coloration JSON simple (clés, chaînes, nombres, booléens/null). */
function JsonView({ data }: { data: unknown }) {
    const json = JSON.stringify(data, null, 2);
    const parts: React.ReactNode[] = [];
    const re =
        /("(?:[^"\\]|\\.)*")(\s*:)?|(\btrue\b|\bfalse\b|\bnull\b)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;
    let last = 0;
    let m: RegExpExecArray | null;
    let key = 0;
    while ((m = re.exec(json)) !== null) {
        if (m.index > last) parts.push(json.slice(last, m.index));
        if (m[1]) {
            parts.push(
                <span
                    key={key++}
                    className={
                        m[2]
                            ? "text-primary"
                            : "text-emerald-600 dark:text-emerald-400"
                    }
                >
                    {m[1]}
                </span>,
            );
            if (m[2]) parts.push(m[2]);
        } else if (m[3]) {
            parts.push(
                <span key={key++} className="text-purple-600 dark:text-purple-400">
                    {m[3]}
                </span>,
            );
        } else if (m[4]) {
            parts.push(
                <span key={key++} className="text-sky-600 dark:text-sky-400">
                    {m[4]}
                </span>,
            );
        }
        last = re.lastIndex;
    }
    if (last < json.length) parts.push(json.slice(last));

    return (
        <pre className="bg-muted max-h-[28rem] overflow-auto rounded-lg p-4 font-mono text-xs leading-5 whitespace-pre-wrap">
            {parts}
        </pre>
    );
}

/** Rend le résultat DSL : gros nombre pour COUNT, tableau pour un tableau
 *  d'objets (avec bascule JSON), JSON coloré sinon. */
export function ResultView({ result }: { result: unknown }) {
    const { t } = useTranslation();
    const [asJson, setAsJson] = useState(false);
    const tabular = isTabular(result);

    if (typeof result === "number") {
        return (
            <div className="flex flex-1 flex-col items-center justify-center gap-1 py-10">
                <span className="text-primary text-5xl font-semibold tabular-nums">
                    {result}
                </span>
                <span className="text-muted-foreground text-sm">
                    {t("adminPages.dsl.countResult", { count: result })}
                </span>
            </div>
        );
    }

    if (Array.isArray(result) && result.length === 0) {
        return (
            <p className="text-muted-foreground py-10 text-center text-sm">
                {t("adminPages.dsl.noRows")}
            </p>
        );
    }

    return (
        <div className="flex flex-1 flex-col gap-3">
            {tabular ? (
                <div className="flex justify-end">
                    <div className="bg-muted inline-flex rounded-md p-0.5 text-xs">
                        <button
                            type="button"
                            onClick={() => setAsJson(false)}
                            className={`rounded px-2 py-1 ${!asJson ? "bg-background shadow-sm" : "text-muted-foreground"}`}
                        >
                            {t("adminPages.dsl.viewTable")}
                        </button>
                        <button
                            type="button"
                            onClick={() => setAsJson(true)}
                            className={`rounded px-2 py-1 ${asJson ? "bg-background shadow-sm" : "text-muted-foreground"}`}
                        >
                            {t("adminPages.dsl.viewJson")}
                        </button>
                    </div>
                </div>
            ) : null}
            {tabular && !asJson ? (
                <ResultTable rows={result} />
            ) : (
                <JsonView data={result} />
            )}
        </div>
    );
}
