import { useTranslation } from "react-i18next";
import { PageHeader } from "@workspace/ui/components/page-header";
import { PointBalanceCard } from "../components/point-balance-card";
import { TransactionHistory } from "../components/transaction-history";
import { TransferForm } from "../components/transfer-form";

export function PointsPage() {
    const { t } = useTranslation();

    return (
        <div className="p-6 md:p-8">
            <div className="mx-auto flex max-w-7xl flex-col gap-6">
                <PageHeader
                    title={t("pages.points.title")}
                    description={t("pages.points.description")}
                />

                <PointBalanceCard />

                <TransferForm />

                <TransactionHistory />
            </div>
        </div>
    );
}
