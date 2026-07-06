import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Add01Icon,
    Alert01Icon,
    Building01Icon,
    CheckmarkCircle01Icon,
    Delete01Icon,
    Edit01Icon,
    Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute } from "@tanstack/react-router";
import {
    useCreateNeighborhood,
    useDeleteNeighborhood,
    useNeighborhoods,
    useUpdateNeighborhood,
} from "@workspace/shared/lib/hooks/neighborhoods.hooks";
import type { Neighborhood } from "@workspace/shared/lib/types";
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@workspace/ui/components/alert";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { DataState } from "@workspace/ui/components/data-state";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@workspace/ui/components/dialog";
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@workspace/ui/components/empty";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
    DrawControl,
    Map,
    NeighborhoodPolygon,
} from "@workspace/ui/components/map";
import { PageHeader } from "@workspace/ui/components/page-header";
import { DataPagination } from "@workspace/ui/components/pagination";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { SortableHead } from "@workspace/ui/components/sortable-head";
import { Spinner } from "@workspace/ui/components/spinner";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@workspace/ui/components/table";
import { useTableSort } from "@workspace/ui/hooks/use-table-sort";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/neighborhoods/")({
    component: NeighborhoodsPage,
});

const PAGE_SIZE = 10;

function NeighborhoodsPage() {
    const { t } = useTranslation();
    const [createOpen, setCreateOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Neighborhood | null>(null);

    const { data, isLoading, isError, refetch } = useNeighborhoods();
    const neighborhoods = data ?? [];
    const deleteNeighborhood = useDeleteNeighborhood();

    const [search, setSearch] = useState("");
    const query = search.trim().toLowerCase();
    const filtered = neighborhoods.filter(
        (nbh) =>
            query.length === 0 ||
            nbh.name.toLowerCase().includes(query) ||
            (nbh.city ?? "").toLowerCase().includes(query),
    );

    const { sorted, toggle, getSortDirection } = useTableSort(filtered, {
        initial: { key: "name", direction: "asc" },
    });
    const [page, setPage] = useState(1);
    const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
    const currentPage = Math.min(page, Math.max(1, pageCount));
    const pageRows = sorted.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE,
    );

    function handleSort(key: string) {
        toggle(key);
        setPage(1);
    }

    function handleDelete(id: string) {
        deleteNeighborhood.mutate(id, {
            onSuccess: () =>
                toast.success(t("adminPages.neighborhoods.deleted")),
            onError: () => toast.error(t("adminPages.common.deleteError")),
        });
    }

    return (
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6 md:p-8">
            <PageHeader
                title={t("adminPages.neighborhoods.title")}
                description={t("adminPages.neighborhoods.description")}
                actions={
                    <Button onClick={() => setCreateOpen(true)}>
                        <HugeiconsIcon icon={Add01Icon} />
                        {t("adminPages.common.create")}
                    </Button>
                }
            />

            <DataState
                loading={isLoading}
                error={isError ? true : undefined}
                isEmpty={neighborhoods.length === 0}
                onRetry={() => refetch()}
                errorTitle={t("adminPages.neighborhoods.loadError")}
                skeleton={
                    <div className="flex flex-col gap-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full rounded" />
                        ))}
                    </div>
                }
                empty={
                    <Empty>
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <HugeiconsIcon icon={Building01Icon} />
                            </EmptyMedia>
                            <EmptyTitle>
                                {t("adminPages.neighborhoods.emptyTitle")}
                            </EmptyTitle>
                            <EmptyDescription>
                                {t("adminPages.neighborhoods.emptyDescription")}
                            </EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent>
                            <Button onClick={() => setCreateOpen(true)}>
                                <HugeiconsIcon icon={Add01Icon} />
                                {t("adminPages.neighborhoods.createCta")}
                            </Button>
                        </EmptyContent>
                    </Empty>
                }
            >
                <div className="space-y-4">
                    <div className="relative w-full sm:w-64">
                        <HugeiconsIcon
                            icon={Search01Icon}
                            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                        />
                        <Input
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            placeholder={t(
                                "adminPages.neighborhoods.searchPlaceholder",
                            )}
                            className="pl-9"
                            data-testid="neighborhood-search"
                        />
                    </div>
                    <div className="bg-card rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <SortableHead
                                        direction={getSortDirection("name")}
                                        onSort={() => handleSort("name")}
                                    >
                                        {t("adminPages.common.name")}
                                    </SortableHead>
                                    <SortableHead
                                        direction={getSortDirection("city")}
                                        onSort={() => handleSort("city")}
                                    >
                                        {t("adminPages.neighborhoods.city")}
                                    </SortableHead>
                                    <TableHead>
                                        {t("adminPages.neighborhoods.polygon")}
                                    </TableHead>
                                    <TableHead className="text-right">
                                        {t("adminPages.common.actions")}
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pageRows.map((nbh) => (
                                    <TableRow key={nbh._id}>
                                        <TableCell className="py-2 font-medium">
                                            {nbh.name}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground py-2">
                                            {nbh.city}
                                        </TableCell>
                                        <TableCell className="py-2">
                                            {nbh.geometry ? (
                                                <Badge variant="outline">
                                                    <HugeiconsIcon
                                                        icon={
                                                            CheckmarkCircle01Icon
                                                        }
                                                    />
                                                    {t(
                                                        "adminPages.neighborhoods.defined",
                                                    )}
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary">
                                                    {t(
                                                        "adminPages.neighborhoods.notDefined",
                                                    )}
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="py-2 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 text-xs"
                                                    onClick={() =>
                                                        setEditTarget(nbh)
                                                    }
                                                >
                                                    <HugeiconsIcon
                                                        icon={Edit01Icon}
                                                    />
                                                    {t(
                                                        "adminPages.common.edit",
                                                    )}
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-destructive hover:text-destructive h-8 text-xs"
                                                            disabled={
                                                                deleteNeighborhood.isPending
                                                            }
                                                        >
                                                            {deleteNeighborhood.isPending ? (
                                                                <Spinner className="mr-2" />
                                                            ) : (
                                                                <HugeiconsIcon
                                                                    icon={
                                                                        Delete01Icon
                                                                    }
                                                                />
                                                            )}
                                                            {t("common.delete")}
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>
                                                                {t(
                                                                    "adminPages.neighborhoods.deleteConfirmTitle",
                                                                )}
                                                            </AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                {t(
                                                                    "adminPages.neighborhoods.deleteConfirmDescription",
                                                                    {
                                                                        name: nbh.name,
                                                                    },
                                                                )}
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>
                                                                {t(
                                                                    "common.cancel",
                                                                )}
                                                            </AlertDialogCancel>
                                                            <AlertDialogAction
                                                                variant="destructive"
                                                                onClick={() =>
                                                                    handleDelete(
                                                                        nbh._id,
                                                                    )
                                                                }
                                                            >
                                                                {t(
                                                                    "common.delete",
                                                                )}
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                    <DataPagination
                        page={currentPage}
                        pageCount={pageCount}
                        onPageChange={setPage}
                        previousLabel={t("adminPages.common.previousPage")}
                        nextLabel={t("adminPages.common.nextPage")}
                    />
                </div>
            </DataState>

            <NeighborhoodDialog
                open={createOpen}
                others={neighborhoods}
                onOpenChange={setCreateOpen}
                onSuccess={() => setCreateOpen(false)}
            />

            {editTarget && (
                <NeighborhoodDialog
                    key={editTarget._id}
                    open
                    initial={editTarget}
                    others={neighborhoods.filter(
                        (n) => n._id !== editTarget._id,
                    )}
                    onOpenChange={(open) => {
                        if (!open) setEditTarget(null);
                    }}
                    onSuccess={() => setEditTarget(null)}
                />
            )}
        </div>
    );
}

function PolygonEditor({
    initialGeometry,
    others,
    onChange,
}: {
    initialGeometry?: GeoJSON.Polygon;
    others: Neighborhood[];
    onChange: (geometry: GeoJSON.Polygon | null) => void;
}) {
    const { t } = useTranslation();
    return (
        <div className="space-y-2">
            <Label>{t("adminPages.neighborhoods.polygonOnMap")}</Label>
            <p className="text-muted-foreground text-xs">
                {t("adminPages.neighborhoods.polygonHint")}
            </p>
            <Map center={[48.8566, 2.3522]} zoom={13} className="h-80 w-full">
                {others.map((n) =>
                    n.geometry ? (
                        <NeighborhoodPolygon
                            key={n._id}
                            geometry={n.geometry as GeoJSON.Polygon}
                            label={n.name}
                        />
                    ) : null,
                )}
                <DrawControl
                    mode="polygon"
                    initialGeometry={initialGeometry}
                    onCreate={onChange}
                    onEdit={onChange}
                    onDelete={() => onChange(null)}
                />
            </Map>
        </div>
    );
}

function isOverlapError(error: Error): boolean {
    return (error as { status?: number }).status === 409;
}

function NeighborhoodDialog({
    open,
    initial,
    others,
    onOpenChange,
    onSuccess,
}: {
    open: boolean;
    initial?: Neighborhood;
    others: Neighborhood[];
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}) {
    const { t } = useTranslation();
    const [name, setName] = useState(initial?.name ?? "");
    const [city, setCity] = useState(initial?.city ?? "");
    const [description, setDescription] = useState(initial?.description ?? "");
    const [geometry, setGeometry] = useState<GeoJSON.Polygon | null>(
        (initial?.geometry as GeoJSON.Polygon | undefined) ?? null,
    );

    const createNeighborhood = useCreateNeighborhood();
    const updateNeighborhood = useUpdateNeighborhood();
    const isPending =
        createNeighborhood.isPending || updateNeighborhood.isPending;
    const submitError = initial
        ? updateNeighborhood.error
        : createNeighborhood.error;

    function resetSubmitError() {
        createNeighborhood.reset();
        updateNeighborhood.reset();
    }

    function handleGeometryChange(next: GeoJSON.Polygon | null) {
        resetSubmitError();
        setGeometry(next);
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim()) return;

        const payload = {
            name: name.trim(),
            city: city.trim(),
            description: description.trim() || undefined,
            ...(geometry ? { geometry } : {}),
        };

        if (initial) {
            updateNeighborhood.mutate(
                { id: initial._id, data: payload },
                {
                    onSuccess: () => {
                        toast.success(t("adminPages.neighborhoods.updated"));
                        onSuccess();
                    },
                },
            );
        } else {
            createNeighborhood.mutate(payload, {
                onSuccess: () => {
                    toast.success(t("adminPages.neighborhoods.created"));
                    onSuccess();
                },
            });
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {initial
                            ? t("adminPages.neighborhoods.editTitle")
                            : t("adminPages.neighborhoods.createTitle")}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="nbh-name">
                                {t("adminPages.neighborhoods.nameLabel")}
                            </Label>
                            <Input
                                id="nbh-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={t(
                                    "adminPages.neighborhoods.namePlaceholder",
                                )}
                                maxLength={100}
                                required
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="nbh-city">
                                {t("adminPages.neighborhoods.cityLabel")}
                            </Label>
                            <Input
                                id="nbh-city"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                placeholder={t(
                                    "adminPages.neighborhoods.cityPlaceholder",
                                )}
                                maxLength={100}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="nbh-desc">
                            {t("incidents.fields.description")}
                        </Label>
                        <Input
                            id="nbh-desc"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t(
                                "adminPages.neighborhoods.descriptionPlaceholder",
                            )}
                            maxLength={500}
                        />
                    </div>

                    {open && (
                        <PolygonEditor
                            initialGeometry={
                                (initial?.geometry as
                                    | GeoJSON.Polygon
                                    | undefined) ?? undefined
                            }
                            others={others}
                            onChange={handleGeometryChange}
                        />
                    )}

                    {geometry && (
                        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                            <HugeiconsIcon
                                icon={CheckmarkCircle01Icon}
                                className="text-primary size-4"
                            />
                            {t("adminPages.neighborhoods.polygonPoints", {
                                count: geometry.coordinates[0].length - 1,
                            })}
                        </p>
                    )}

                    {!geometry && !initial && (
                        <Alert>
                            <HugeiconsIcon
                                icon={Alert01Icon}
                                className="size-4"
                            />
                            <AlertDescription>
                                {t("adminPages.neighborhoods.noPolygonWarning")}
                            </AlertDescription>
                        </Alert>
                    )}

                    {submitError && (
                        <Alert variant="destructive">
                            <HugeiconsIcon
                                icon={Alert01Icon}
                                className="size-4"
                            />
                            <AlertTitle>
                                {isOverlapError(submitError)
                                    ? t("adminPages.neighborhoods.overlapError")
                                    : initial
                                      ? t(
                                            "adminPages.neighborhoods.updateError",
                                        )
                                      : t(
                                            "adminPages.neighborhoods.createError",
                                        )}
                            </AlertTitle>
                            <AlertDescription>
                                {isOverlapError(submitError)
                                    ? t(
                                          "adminPages.neighborhoods.overlapErrorDetail",
                                      )
                                    : t(
                                          "adminPages.neighborhoods.submitErrorDetail",
                                      )}
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            {t("common.cancel")}
                        </Button>
                        <Button
                            type="submit"
                            disabled={isPending || !name.trim() || !city.trim()}
                        >
                            {isPending && <Spinner className="mr-2" />}
                            {initial
                                ? t("common.save")
                                : t("adminPages.common.create")}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
