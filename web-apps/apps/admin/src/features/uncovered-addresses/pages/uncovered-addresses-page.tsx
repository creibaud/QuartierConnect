import { useTranslation } from "react-i18next";
import {
    ListViewIcon,
    MapsLocation01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { DataState } from "@workspace/ui/components/data-state";
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@workspace/ui/components/empty";
import { Map, Marker } from "@workspace/ui/components/map";
import { PageHeader } from "@workspace/ui/components/page-header";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@workspace/ui/components/table";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@workspace/ui/components/tabs";
import {
    useUncoveredAddresses,
    type UncoveredResident,
} from "../hooks/uncovered-addresses.hooks";

export function UncoveredAddressesPage() {
    const { t } = useTranslation();
    const { data, isLoading, isError, refetch } = useUncoveredAddresses();
    const residents = data ?? [];

    return (
        <div className="p-6">
            <div className="mx-auto flex max-w-6xl flex-col gap-6">
                <PageHeader
                    title={t("adminPages.coverage.title")}
                    description={t("adminPages.coverage.description")}
                    actions={
                        <Button asChild variant="outline">
                            <Link to="/neighborhoods">
                                {t("adminPages.coverage.drawNeighborhood")}
                            </Link>
                        </Button>
                    }
                />

                <Tabs defaultValue="list" className="gap-4">
                    <TabsList>
                        <TabsTrigger value="list">
                            <HugeiconsIcon icon={ListViewIcon} />
                            {t("adminPages.common.listTab")}
                        </TabsTrigger>
                        <TabsTrigger value="map">
                            <HugeiconsIcon icon={MapsLocation01Icon} />
                            {t("adminPages.common.mapTab")}
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="list">
                        <DataState
                            loading={isLoading}
                            error={isError ? true : undefined}
                            isEmpty={residents.length === 0}
                            onRetry={() => refetch()}
                            errorTitle={t("adminPages.coverage.loadError")}
                            skeleton={
                                <div className="flex flex-col gap-2">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <Skeleton
                                            key={i}
                                            className="h-12 w-full rounded"
                                        />
                                    ))}
                                </div>
                            }
                            empty={
                                <Empty>
                                    <EmptyHeader>
                                        <EmptyMedia variant="icon">
                                            <HugeiconsIcon
                                                icon={MapsLocation01Icon}
                                            />
                                        </EmptyMedia>
                                        <EmptyTitle>
                                            {t("adminPages.coverage.emptyTitle")}
                                        </EmptyTitle>
                                        <EmptyDescription>
                                            {t(
                                                "adminPages.coverage.emptyDescription",
                                            )}
                                        </EmptyDescription>
                                    </EmptyHeader>
                                </Empty>
                            }
                        >
                            <div className="bg-card rounded-lg border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>
                                                {t(
                                                    "adminPages.coverage.residentColumn",
                                                )}
                                            </TableHead>
                                            <TableHead>
                                                {t(
                                                    "adminPages.coverage.addressColumn",
                                                )}
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {residents.map(
                                            (r: UncoveredResident) => (
                                                <TableRow key={r.userId}>
                                                    <TableCell className="font-medium">
                                                        {r.firstName}
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground">
                                                        {r.address}
                                                    </TableCell>
                                                </TableRow>
                                            ),
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </DataState>
                    </TabsContent>

                    <TabsContent value="map">
                        <UncoveredAddressesMap residents={residents} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

function UncoveredAddressesMap({
    residents,
}: {
    residents: UncoveredResident[];
}) {
    const { t } = useTranslation();
    const center: [number, number] =
        residents.length > 0
            ? [residents[0].lat, residents[0].lng]
            : [48.8566, 2.3522];

    return (
        <Map
            center={center}
            zoom={12}
            className="h-[600px] min-h-[60vh] w-full overflow-hidden rounded-lg border"
        >
            {residents.map((r) => (
                <Marker
                    key={r.userId}
                    variant="default"
                    position={[r.lat, r.lng]}
                    popup={
                        <div className="space-y-1">
                            <p className="font-medium">{r.firstName}</p>
                            <p className="text-xs">{r.address}</p>
                            <p className="text-muted-foreground text-xs">
                                {t("adminPages.coverage.pendingLabel")}
                            </p>
                        </div>
                    }
                />
            ))}
        </Map>
    );
}
