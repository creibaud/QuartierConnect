import { useTranslation } from "react-i18next";
import { useContractAudit } from "@workspace/shared/lib/hooks/useContracts";
import { DataState } from "@workspace/ui/components/data-state";
import { Skeleton } from "@workspace/ui/components/skeleton";

export function ContractAuditTimeline({ contractId }: { contractId: string }) {
    const { t } = useTranslation();
    const { data, isLoading, isError, refetch } = useContractAudit(contractId);
    const entries = data ?? [];

    return (
        <DataState
            loading={isLoading}
            error={isError ? true : undefined}
            isEmpty={entries.length === 0}
            onRetry={() => void refetch()}
            skeleton={<Skeleton className="h-40 w-full rounded-md" />}
            empty={
                <p className="text-muted-foreground text-sm">
                    {t("pages.contractDetail.auditEmpty")}
                </p>
            }
        >
            <ol className="space-y-3">
                {entries.map((e, i) => (
                    <li key={i} className="border-l-2 pl-3 text-sm">
                        <span className="font-medium">
                            {t(`contracts.audit.action.${e.action}`)}
                        </span>
                        <span className="text-muted-foreground block text-xs">
                            {new Date(e.at).toLocaleString("fr-FR")}
                            {e.sha256 ? ` · #${e.sha256.slice(0, 8)}` : ""}
                        </span>
                    </li>
                ))}
            </ol>
        </DataState>
    );
}
