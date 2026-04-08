import { useState } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { apiPost, ensureAuthenticated } from "@workspace/shared/lib/api";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components/card";
import { Textarea } from "@workspace/ui/components/textarea";

export const Route = createFileRoute("/dsl/")({
    beforeLoad: async () => {
        const user = await ensureAuthenticated();
        if (!user)
            throw redirect({ to: "/login", search: { forbidden: false } });
        if (user.role !== "admin")
            throw redirect({ to: "/login", search: { forbidden: true } });
    },
    component: DslPage,
});

const EXAMPLES = [
    'FIND incidents WHERE status = "open" LIMIT 10',
    'FIND services WHERE category = "culture" LIMIT 5',
    "FIND events LIMIT 20",
    'COUNT incidents WHERE status = "resolved"',
];

function DslPage() {
    const [query, setQuery] = useState(EXAMPLES[0]);
    const [result, setResult] = useState<unknown>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [elapsed, setElapsed] = useState<number | null>(null);

    async function handleRun() {
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
            const msg = err instanceof Error ? err.message : "Erreur inconnue";
            setError(msg);
        } finally {
            setLoading(false);
        }
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            e.preventDefault();
            handleRun();
        }
    }

    const resultCount = Array.isArray(result) ? result.length : null;

    return (
        <div className="min-h-screen bg-zinc-50 p-6 dark:bg-zinc-950">
            <div className="mx-auto max-w-4xl space-y-6">
                <header className="flex items-center justify-between">
                    <div className="space-y-1">
                        <h1 className="text-xl font-semibold">Éditeur DSL</h1>
                        <Link
                            to="/dashboard"
                            className="text-muted-foreground text-sm hover:underline"
                        >
                            ← Tableau de bord
                        </Link>
                    </div>
                </header>

                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base">Requête</CardTitle>
                            <p className="text-muted-foreground text-xs">
                                Ctrl+Entrée pour exécuter
                            </p>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Textarea
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder='FIND incidents WHERE status = "open" LIMIT 10'
                            className="min-h-24 resize-y font-mono text-sm"
                            maxLength={500}
                            spellCheck={false}
                        />
                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                onClick={handleRun}
                                disabled={loading || !query.trim()}
                            >
                                {loading ? "Exécution…" : "Exécuter"}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setQuery("");
                                    setResult(null);
                                    setError(null);
                                }}
                            >
                                Effacer
                            </Button>
                            <span className="text-muted-foreground ml-1 text-xs">
                                {query.length}/500
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {EXAMPLES.map((ex) => (
                                <button
                                    key={ex}
                                    type="button"
                                    onClick={() => setQuery(ex)}
                                    className="border-muted-foreground/40 hover:border-muted-foreground text-muted-foreground hover:text-foreground rounded border border-dashed px-2 py-1 font-mono text-xs transition-colors"
                                >
                                    {ex.length > 40
                                        ? `${ex.slice(0, 40)}…`
                                        : ex}
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {(result !== null || error !== null) && (
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-3">
                                <CardTitle className="text-base">
                                    Résultats
                                </CardTitle>
                                {error ? (
                                    <Badge variant="destructive">Erreur</Badge>
                                ) : (
                                    <Badge variant="secondary">
                                        {resultCount !== null
                                            ? `${resultCount} résultat${resultCount !== 1 ? "s" : ""}`
                                            : "OK"}
                                        {elapsed !== null
                                            ? ` · ${elapsed}ms`
                                            : ""}
                                    </Badge>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {error ? (
                                <p className="text-destructive font-mono text-sm whitespace-pre-wrap">
                                    {error}
                                </p>
                            ) : (
                                <pre className="bg-muted max-h-96 overflow-auto rounded-lg p-4 font-mono text-xs break-all whitespace-pre-wrap">
                                    {JSON.stringify(result, null, 2)}
                                </pre>
                            )}
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Syntaxe DSL</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                            <div>
                                <p className="mb-2 font-medium">
                                    Collections disponibles
                                </p>
                                <ul className="text-muted-foreground space-y-1 font-mono text-xs">
                                    <li>incidents</li>
                                    <li>services</li>
                                    <li>events</li>
                                    <li>neighborhoods</li>
                                    <li>users</li>
                                </ul>
                            </div>
                            <div>
                                <p className="mb-2 font-medium">Syntaxe</p>
                                <ul className="text-muted-foreground space-y-1 font-mono text-xs">
                                    <li>FIND &lt;collection&gt;</li>
                                    <li>
                                        WHERE &lt;field&gt; = "&lt;value&gt;"
                                    </li>
                                    <li>AND / OR</li>
                                    <li>LIMIT &lt;n&gt;</li>
                                    <li>COUNT &lt;collection&gt;</li>
                                </ul>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
