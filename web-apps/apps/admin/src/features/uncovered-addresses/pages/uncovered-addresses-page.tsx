import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ListViewIcon, MapsLocation01Icon } from "@hugeicons/core-free-icons";
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
import { DataPagination } from "@workspace/ui/components/pagination";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { SortableHead } from "@workspace/ui/components/sortable-head";
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from "@workspace/ui/components/table";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@workspace/ui/components/tabs";
import { useTableSort } from "@workspace/ui/hooks/use-table-sort";
import {
    useUncoveredAddresses,
    type UncoveredResident,
} from "../hooks/uncovered-addresses.hooks";

const PAGE_SIZE = 10;

export function UncoveredAddressesPage() {
    const { t } = useTranslation();
    const { data, isLoading, isError, refetch } = useUncoveredAddresses();
    const residents = data ?? [];

    const { sorted, toggle, getSortDirection } = useTableSort(residents, {
        initial: { key: "firstName", direction: "asc" },
    });
    const [page, setPage] = useState(1);
    const pageCount = Math.ceil(sorted.length / PAGE_SIZE);
    const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    function handleSort(key: string) {
        toggle(key);
        setPage(1);
    }

    return (
        <div className="space-y-6 p-6">
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
                        <div className="space-y-4">
                            <div className="bg-card rounded-lg border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <SortableHead
                                                direction={getSortDirection(
                                                    "firstName",
                                                )}
                                                onSort={() =>
                                                    handleSort("firstName")
                                                }
                                            >
                                                {t(
                                                    "adminPages.coverage.residentColumn",
                                                )}
                                            </SortableHead>
                                            <SortableHead
                                                direction={getSortDirection(
                                                    "address",
                                                )}
                                                onSort={() =>
                                                    handleSort("address")
                                                }
                                            >
                                                {t(
                                                    "adminPages.coverage.addressColumn",
                                                )}
                                            </SortableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {pageRows.map(
                                            (r: UncoveredResident) => (
                                                <TableRow key={r.userId}>
                                                    <TableCell className="py-2 font-medium">
                                                        {r.firstName}
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground py-2">
                                                        {r.address}
                                                    </TableCell>
                                                </TableRow>
                                            ),
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                            <DataPagination
                                page={page}
                                pageCount={pageCount}
                                onPageChange={setPage}
                                previousLabel={t(
                                    "adminPages.common.previousPage",
                                )}
                                nextLabel={t("adminPages.common.nextPage")}
                            />
                        </div>
                    </DataState>
                </TabsContent>

                <TabsContent value="map">
                    <UncoveredAddressesMap residents={residents} />
                </TabsContent>
            </Tabs>
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
