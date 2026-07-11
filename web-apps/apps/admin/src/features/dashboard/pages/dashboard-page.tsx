import { Add01Icon, CodeSquareIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { getCurrentUser } from "@workspace/shared/lib/auth";
import { useGlobalStats } from "@workspace/shared/lib/hooks/useStats";
import { Button } from "@workspace/ui/components/button";
import { PageHeader } from "@workspace/ui/components/page-header";
import { useUncoveredAddresses } from "@/features/uncovered-addresses/hooks/uncovered-addresses.hooks";
import { DashboardStats } from "../components/dashboard-stats";
import { PendingAddressesCard } from "../components/pending-addresses-card";
import { RecentIncidentsCard } from "../components/recent-incidents-card";

export function AdminDashboardPage() {
    const { t } = useTranslation();
    const user = getCurrentUser();
    const { data: stats, isLoading: statsLoading } = useGlobalStats();
    const uncoveredAddresses = useUncoveredAddresses();

    return (
        <div className="p-6 md:p-8">
            <div className="mx-auto flex max-w-7xl flex-col gap-6">
                <PageHeader
                    title={t("adminPages.dashboard.title")}
                    description={user?.email}
                    actions={
                        <>
                            <Button asChild variant="outline">
                                <Link to="/dsl">
                                    <HugeiconsIcon icon={CodeSquareIcon} />
                                    {t("nav.dsl")}
                                </Link>
                            </Button>
                            <Button asChild>
                                <Link to="/neighborhoods">
                                    <HugeiconsIcon icon={Add01Icon} />
                                    {t("adminPages.neighborhoods.createCta")}
                                </Link>
                            </Button>
                        </>
                    }
                />

                <DashboardStats
                    stats={stats}
                    statsLoading={statsLoading}
                    uncoveredCount={uncoveredAddresses.data?.length}
                    uncoveredLoading={uncoveredAddresses.isLoading}
                />

                <div className="grid gap-4 lg:grid-cols-2">
                    <RecentIncidentsCard />
                    <PendingAddressesCard
                        residents={uncoveredAddresses.data ?? []}
                        loading={uncoveredAddresses.isLoading}
                        error={uncoveredAddresses.isError ? true : undefined}
                        onRetry={() => uncoveredAddresses.refetch()}
                    />
                </div>
            </div>
        </div>
    );
}
