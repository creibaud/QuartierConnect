import { useRef } from "react";
import { TOKEN_CLASS, tokenizeQuery } from "../lib/tokenize-query";

/** Syntax-highlighted editor: a colored <pre> aligned behind a transparent
 *  <textarea>, so the caret and typing stay native. */
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
                aria-label={placeholder}
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
