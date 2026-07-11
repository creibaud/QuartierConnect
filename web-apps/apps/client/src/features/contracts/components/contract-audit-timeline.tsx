import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { ContractAuditEntry } from "@workspace/shared/lib/types";
import { useContractAudit } from "@workspace/shared/lib/hooks/useContracts";
import { DataState } from "@workspace/ui/components/data-state";
import { Skeleton } from "@workspace/ui/components/skeleton";

interface AuditRow {
    action: ContractAuditEntry["action"];
    userId: string;
    count: number;
    at: string;
    sha256?: string;
}

function groupConsecutiveViews(entries: ContractAuditEntry[]): AuditRow[] {
    const rows: AuditRow[] = [];
    for (const entry of entries) {
        const last = rows[rows.length - 1];
        const isRepeatView =
            entry.action === "viewed" &&
            last?.action === "viewed" &&
            last.userId === entry.userId;
        if (isRepeatView) {
            last.count += 1;
            last.at = entry.at;
        } else {
            rows.push({ ...entry, count: 1 });
        }
    }
    return rows;
}

export function ContractAuditTimeline({ contractId }: { contractId: string }) {
    const { t, i18n } = useTranslation();
    const { data, isLoading, isError, refetch } = useContractAudit(contractId);
    const rows = useMemo(() => groupConsecutiveViews(data ?? []), [data]);

    return (
        <DataState
            loading={isLoading}
            error={isError ? true : undefined}
            isEmpty={rows.length === 0}
            onRetry={() => void refetch()}
            skeleton={<Skeleton className="h-40 w-full rounded-md" />}
            empty={
                <p className="text-muted-foreground text-sm">
                    {t("pages.contractDetail.auditEmpty")}
                </p>
            }
        >
            <ol className="space-y-3">
                {rows.map((row, i) => (
                    <li key={i} className="border-l-2 pl-3 text-sm">
                        <span className="font-medium">
                            {t(`contracts.audit.action.${row.action}`)}
                            {row.count > 1 ? ` ×${row.count}` : ""}
                        </span>
                        <span className="text-muted-foreground block text-xs">
                            {new Date(row.at).toLocaleString(i18n.language)}
                            {row.sha256 ? ` · #${row.sha256.slice(0, 8)}` : ""}
                        </span>
                    </li>
                ))}
            </ol>
        </DataState>
    );
}
