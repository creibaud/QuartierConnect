import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useInfiniteIncidents } from "@workspace/shared/lib/hooks/incidents.hooks";
import { Button } from "@workspace/ui/components/button";
import { DataState } from "@workspace/ui/components/data-state";
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@workspace/ui/components/empty";
import { PageHeader } from "@workspace/ui/components/page-header";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { CreateIncidentDialog } from "../components/create-incident-dialog";
import { IncidentsList } from "../components/incidents-list";
import { IncidentsMapCard } from "../components/incidents-map-card";

export function IncidentsPage() {
    const { t } = useTranslation();
    const [createOpen, setCreateOpen] = useState(false);
    const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage } =
        useInfiniteIncidents();
    const incidents = data?.pages.flat() ?? [];

    return (
        <div className="p-6 md:p-8">
            <div className="mx-auto flex max-w-7xl flex-col gap-6">
                <PageHeader
                    title={t("incidents.title")}
                    description={t("pages.incidents.description")}
                    actions={
                        <Button onClick={() => setCreateOpen(true)}>
                            <HugeiconsIcon icon={Alert01Icon} />
                            {t("incidents.new")}
                        </Button>
                    }
                />

                <IncidentsMapCard incidents={incidents} />

                <DataState
                    loading={isLoading}
                    error={isError ? true : undefined}
                    isEmpty={incidents.length === 0}
                    onRetry={() => refetch()}
                    skeleton={
                        <div className="space-y-3">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <Skeleton
                                    key={i}
                                    className="h-20 w-full rounded-lg"
                                />
                            ))}
                        </div>
                    }
                    empty={
                        <Empty>
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <HugeiconsIcon icon={Alert01Icon} />
                                </EmptyMedia>
                                <EmptyTitle>
                                    {t("pages.incidents.emptyTitle")}
                                </EmptyTitle>
                                <EmptyDescription>
                                    {t("pages.incidents.emptyDescription")}
                                </EmptyDescription>
                            </EmptyHeader>
                            <EmptyContent>
                                <Button onClick={() => setCreateOpen(true)}>
                                    <HugeiconsIcon icon={Alert01Icon} />
                                    {t("incidents.new")}
                                </Button>
                            </EmptyContent>
                        </Empty>
                    }
                >
                    <IncidentsList
                        incidents={incidents}
                        hasNextPage={!!hasNextPage}
                        onLoadMore={() => fetchNextPage()}
                    />
                </DataState>

                <CreateIncidentDialog
                    open={createOpen}
                    onOpenChange={setCreateOpen}
                    onSuccess={() => setCreateOpen(false)}
                />
            </div>
        </div>
    );
}
