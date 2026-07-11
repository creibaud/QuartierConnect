import { useTranslation } from "react-i18next";
import { DataState } from "@workspace/ui/components/data-state";
import type { UncoveredResident } from "@/features/uncovered-addresses/hooks/uncovered-addresses.hooks";
import { PENDING_ADDRESSES_LIMIT } from "../lib/constants";
import { ListCard } from "./list-card";
import { RowsSkeleton } from "./rows-skeleton";

export function PendingAddressesCard({
    residents,
    loading,
    error,
    onRetry,
}: {
    residents: UncoveredResident[];
    loading: boolean;
    error?: true;
    onRetry: () => void;
}) {
    const { t } = useTranslation();

    return (
        <ListCard
            title={t("adminPages.coverage.title")}
            seeAllTo="/uncovered-addresses"
        >
            <DataState
                loading={loading}
                error={error}
                isEmpty={residents.length === 0}
                onRetry={onRetry}
                errorTitle={t("adminPages.coverage.loadError")}
                skeleton={<RowsSkeleton rows={PENDING_ADDRESSES_LIMIT} />}
                empty={
                    <p className="text-muted-foreground py-4 text-sm">
                        {t("adminPages.coverage.emptyTitle")}
                    </p>
                }
            >
                <ul className="divide-border divide-y">
                    {residents
                        .slice(0, PENDING_ADDRESSES_LIMIT)
                        .map((resident) => (
                            <li
                                key={resident.userId}
                                className="flex items-center gap-3 py-2"
                            >
                                <span className="shrink-0 text-sm font-medium">
                                    {resident.firstName}
                                </span>
                                <span className="text-muted-foreground min-w-0 flex-1 truncate text-sm">
                                    {resident.address}
                                </span>
                            </li>
                        ))}
                </ul>
            </DataState>
        </ListCard>
    );
}
