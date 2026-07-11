import { useState } from "react";
import { useTranslation } from "react-i18next";
import { apiPost } from "@workspace/shared/lib/api";

export function useDslQuery(initialQuery: string) {
    const { t } = useTranslation();
    const [query, setQuery] = useState(initialQuery);
    const [result, setResult] = useState<unknown>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [elapsed, setElapsed] = useState<number | null>(null);

    async function run() {
        if (!query.trim()) return;
        setLoading(true);
        setResult(null);
        setError(null);
        setElapsed(null);
        const start = Date.now();
        try {
            const res = await apiPost<unknown>("/dsl/query", {
                query: query.trim(),
            });
            setResult(res);
            setElapsed(Date.now() - start);
        } catch (err: unknown) {
            const msg =
                err instanceof Error
                    ? err.message
                    : t("adminPages.dsl.unknownError");
            setError(msg);
        } finally {
            setLoading(false);
        }
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            e.preventDefault();
            run();
        }
    }

    function clear() {
        setQuery("");
        setResult(null);
        setError(null);
    }

    const resultCount = Array.isArray(result) ? result.length : null;

    return {
        query,
        setQuery,
        result,
        error,
        loading,
        elapsed,
        resultCount,
        run,
        handleKeyDown,
        clear,
    };
}
