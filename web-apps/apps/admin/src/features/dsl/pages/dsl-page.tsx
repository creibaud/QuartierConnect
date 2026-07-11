import {
    Alert01Icon,
    CodeSquareIcon,
    PlayIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslation } from "react-i18next";
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
import { DslExamples } from "../components/dsl-examples";
import { DslSyntaxCard } from "../components/dsl-syntax-card";
import { QueryEditor } from "../components/query-editor";
import { ResultView } from "../components/result-view";
import { useDslQuery } from "../hooks/use-dsl-query";
import { DSL_EXAMPLES } from "../lib/dsl-examples";

export function DslPage() {
    const { t } = useTranslation();
    const {
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
    } = useDslQuery(DSL_EXAMPLES[0]);

    return (
        <div className="p-6 md:p-8">
            <div className="mx-auto flex max-w-7xl flex-col gap-6">
                <PageHeader
                    title={t("adminPages.dsl.title")}
                    description={t("adminPages.dsl.description")}
                    actions={
                        <Button onClick={run} disabled={loading || !query.trim()}>
                            <HugeiconsIcon icon={PlayIcon} />
                            {loading
                                ? t("adminPages.dsl.running")
                                : t("adminPages.dsl.run")}
                        </Button>
                    }
                />

                <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
                    <Card className="flex flex-col">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base">
                                    {t("adminPages.dsl.queryTitle")}
                                </CardTitle>
                                <p className="text-muted-foreground text-xs">
                                    {t("adminPages.dsl.runHint")}
                                </p>
                            </div>
                        </CardHeader>
                        <CardContent className="flex flex-1 flex-col gap-4">
                            <QueryEditor
                                value={query}
                                onChange={setQuery}
                                onKeyDown={handleKeyDown}
                                placeholder='FIND incidents WHERE status = "open" LIMIT 10'
                            />
                            <div className="flex flex-wrap items-center gap-2">
                                <Button variant="outline" onClick={clear}>
                                    {t("adminPages.dsl.clear")}
                                </Button>
                                <span className="text-muted-foreground ml-1 text-xs tabular-nums">
                                    {query.length}/500
                                </span>
                            </div>
                            <DslExamples onSelect={setQuery} />
                        </CardContent>
                    </Card>

                    <Card className="flex flex-col">
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-3">
                                <CardTitle className="text-base">
                                    {t("adminPages.dsl.resultsTitle")}
                                </CardTitle>
                                {error ? (
                                    <Badge variant="destructive">
                                        {t("adminPages.dsl.errorBadge")}
                                    </Badge>
                                ) : result !== null ? (
                                    <Badge variant="secondary">
                                        {resultCount !== null
                                            ? t("adminPages.dsl.resultCount", {
                                                  count: resultCount,
                                              })
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
                                    <AlertTitle>
                                        {t("adminPages.dsl.invalidQuery")}
                                    </AlertTitle>
                                    <AlertDescription className="font-mono whitespace-pre-wrap">
                                        {error}
                                    </AlertDescription>
                                </Alert>
                            ) : result !== null ? (
                                <ResultView result={result} />
                            ) : (
                                <Empty className="flex-1 border">
                                    <EmptyHeader>
                                        <EmptyMedia variant="icon">
                                            <HugeiconsIcon
                                                icon={CodeSquareIcon}
                                            />
                                        </EmptyMedia>
                                        <EmptyTitle>
                                            {t("adminPages.dsl.emptyTitle")}
                                        </EmptyTitle>
                                        <EmptyDescription>
                                            {t(
                                                "adminPages.dsl.emptyDescription",
                                            )}
                                        </EmptyDescription>
                                    </EmptyHeader>
                                </Empty>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <DslSyntaxCard />
            </div>
        </div>
    );
}
