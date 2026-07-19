/** Minimal JSON highlighting (keys, strings, numbers, booleans/null). */
export function JsonView({ data }: { data: unknown }) {
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
                <span
                    key={key++}
                    className="text-purple-600 dark:text-purple-400"
                >
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
