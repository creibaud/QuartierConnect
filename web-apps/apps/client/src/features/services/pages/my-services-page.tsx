import { useTranslation } from "react-i18next";
import { CustomerServiceIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@workspace/ui/components/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components/card";
import { DataState } from "@workspace/ui/components/data-state";
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@workspace/ui/components/empty";
import { PageHeader } from "@workspace/ui/components/page-header";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@workspace/ui/components/tabs";
import { ResponderRow } from "../components/responder-row";
import { useMyServices, useRespondedServices } from "../hooks/services-core.hooks";

export function MyServicesPage() {
    const { t } = useTranslation();

    return (
        <div className="p-6 md:p-8">
            <div className="mx-auto flex max-w-7xl flex-col gap-6">
                <PageHeader
                    title={t("pages.services.mine.title")}
                    description={t("pages.services.mine.description")}
                />

                <Tabs defaultValue="ads">
                    <TabsList>
                        <TabsTrigger value="ads">
                            {t("pages.services.mine.tabAds")}
                        </TabsTrigger>
                        <TabsTrigger value="responses">
                            {t("pages.services.mine.tabResponses")}
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="ads" className="mt-4">
                        <MyAdsTab />
                    </TabsContent>

                    <TabsContent value="responses" className="mt-4">
                        <MyResponsesTab />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

function MyAdsTab() {
    const { t } = useTranslation();
    const { data, isLoading, isError, refetch } = useMyServices();
    const services = data ?? [];

    return (
        <DataState
            loading={isLoading}
            error={isError ? true : undefined}
            isEmpty={services.length === 0}
            onRetry={() => void refetch()}
            skeleton={
                <div className="flex flex-col gap-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-32 w-full rounded-xl" />
                    ))}
                </div>
            }
            empty={
                <Empty className="border">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <HugeiconsIcon icon={CustomerServiceIcon} />
                        </EmptyMedia>
                        <EmptyTitle>
                            {t("pages.services.mine.noAdsTitle")}
                        </EmptyTitle>
                        <EmptyDescription>
                            {t("pages.services.mine.noAdsDescription")}
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            }
        >
            <div className="flex flex-col gap-4">
                {services.map((service) => (
                    <Card key={service._id}>
                        <CardHeader>
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <CardTitle className="text-base">
                                    {service.title}
                                </CardTitle>
                                <div className="flex shrink-0 items-center gap-1">
                                    <Badge
                                        variant={
                                            service.direction === "offer"
                                                ? "default"
                                                : "secondary"
                                        }
                                    >
                                        {service.direction === "offer"
                                            ? t("pages.services.directionOffer")
                                            : t(
                                                  "pages.services.directionRequest",
                                              )}
                                    </Badge>
                                    <Badge variant="outline">
                                        {t(
                                            `pages.services.categories.${service.category}`,
                                        )}
                                    </Badge>
                                </div>
                            </div>
                            {service.description && (
                                <CardDescription className="line-clamp-2">
                                    {service.description}
                                </CardDescription>
                            )}
                        </CardHeader>
                        <CardContent>
                            {(service.responders ?? []).length === 0 ? (
                                <p className="text-muted-foreground text-sm">
                                    {t("pages.services.mine.noResponders")}
                                </p>
                            ) : (
                                <div className="divide-y">
                                    {(service.responders ?? []).map((r) => (
                                        <ResponderRow
                                            key={r.userId}
                                            responder={r}
                                        />
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </DataState>
    );
}

function MyResponsesTab() {
    const { t } = useTranslation();
    const { data, isLoading, isError, refetch } = useRespondedServices();
    const services = data ?? [];

    return (
        <DataState
            loading={isLoading}
            error={isError ? true : undefined}
            isEmpty={services.length === 0}
            onRetry={() => void refetch()}
            skeleton={
                <div className="flex flex-col gap-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-24 w-full rounded-xl" />
                    ))}
                </div>
            }
            empty={
                <Empty className="border">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <HugeiconsIcon icon={CustomerServiceIcon} />
                        </EmptyMedia>
                        <EmptyTitle>
                            {t("pages.services.mine.noResponsesTitle")}
                        </EmptyTitle>
                        <EmptyDescription>
                            {t("pages.services.mine.noResponses")}
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            }
        >
            <div className="flex flex-col gap-4">
                {services.map((service) => (
                    <Card key={service._id}>
                        <CardHeader>
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <CardTitle className="text-base">
                                    {service.title}
                                </CardTitle>
                                <div className="flex shrink-0 items-center gap-1">
                                    <Badge
                                        variant={
                                            service.direction === "offer"
                                                ? "default"
                                                : "secondary"
                                        }
                                    >
                                        {service.direction === "offer"
                                            ? t("pages.services.directionOffer")
                                            : t(
                                                  "pages.services.directionRequest",
                                              )}
                                    </Badge>
                                    <Badge variant="outline">
                                        {t(
                                            `pages.services.categories.${service.category}`,
                                        )}
                                    </Badge>
                                </div>
                            </div>
                            {service.description && (
                                <CardDescription className="line-clamp-2">
                                    {service.description}
                                </CardDescription>
                            )}
                        </CardHeader>
                    </Card>
                ))}
            </div>
        </DataState>
    );
}
