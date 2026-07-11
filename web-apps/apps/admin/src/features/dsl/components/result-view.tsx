import { useState } from "react";
import { useTranslation } from "react-i18next";
import { isTabular } from "../lib/result-format";
import { JsonView } from "./json-view";
import { ResultTable } from "./result-table";

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
