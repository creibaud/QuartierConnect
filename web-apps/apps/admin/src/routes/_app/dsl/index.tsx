import { useState } from "react";
import {
    Alert01Icon,
    CodeSquareIcon,
    PlayIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute } from "@tanstack/react-router";
import { apiPost } from "@workspace/shared/lib/api";
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@workspace/ui/components/alert";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components/card";
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@workspace/ui/components/empty";
import { PageHeader } from "@workspace/ui/components/page-header";
import { Textarea } from "@workspace/ui/components/textarea";

export const Route = createFileRoute("/_app/dsl/")({
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
        <div className="p-6">
            <div className="space-y-6">
                <PageHeader
                    title="Éditeur DSL"
                    description="Interrogez les données en langage naturel"
                    actions={
                        <Button
                            onClick={handleRun}
                            disabled={loading || !query.trim()}
                        >
                            <HugeiconsIcon icon={PlayIcon} />
                            {loading ? "Exécution…" : "Exécuter"}
                        </Button>
                    }
                />

                <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
                    <Card className="flex flex-col">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base">
                                    Requête
                                </CardTitle>
                                <p className="text-muted-foreground text-xs">
                                    Ctrl+Entrée pour exécuter
                                </p>
                            </div>
                        </CardHeader>
                        <CardContent className="flex flex-1 flex-col gap-4">
                            <Textarea
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder='FIND incidents WHERE status = "open" LIMIT 10'
                                className="min-h-48 flex-1 resize-y font-mono text-sm"
                                maxLength={500}
                                spellCheck={false}
                            />
                            <div className="flex flex-wrap items-center gap-2">
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
                                <span className="text-muted-foreground ml-1 text-xs tabular-nums">
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

                    <Card className="flex flex-col">
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-3">
                                <CardTitle className="text-base">
                                    Résultats
                                </CardTitle>
                                {error ? (
                                    <Badge variant="destructive">Erreur</Badge>
                                ) : result !== null ? (
                                    <Badge variant="secondary">
                                        {resultCount !== null
                                            ? `${resultCount} résultat${resultCount !== 1 ? "s" : ""}`
                                            : "OK"}
                                        {elapsed !== null
                                            ? ` · ${elapsed}ms`
                                            : ""}
                                    </Badge>
                                ) : null}
                            </div>
                        </CardHeader>
                        <CardContent className="flex flex-1 flex-col">
                            {error ? (
                                <Alert variant="destructive">
                                    <HugeiconsIcon icon={Alert01Icon} />
                                    <AlertTitle>Requête invalide</AlertTitle>
                                    <AlertDescription className="font-mono whitespace-pre-wrap">
                                        {error}
                                    </AlertDescription>
                                </Alert>
                            ) : result !== null ? (
                                <pre className="bg-muted max-h-[28rem] flex-1 overflow-auto rounded-lg p-4 font-mono text-xs break-all whitespace-pre-wrap">
                                    {JSON.stringify(result, null, 2)}
                                </pre>
                            ) : (
                                <Empty className="flex-1 border">
                                    <EmptyHeader>
                                        <EmptyMedia variant="icon">
                                            <HugeiconsIcon
                                                icon={CodeSquareIcon}
                                            />
                                        </EmptyMedia>
                                        <EmptyTitle>
                                            Écrivez une requête
                                        </EmptyTitle>
                                        <EmptyDescription>
                                            Lancez une requête DSL pour afficher
                                            les résultats ici.
                                        </EmptyDescription>
                                    </EmptyHeader>
                                </Empty>
                            )}
                        </CardContent>
                    </Card>
                </div>

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
