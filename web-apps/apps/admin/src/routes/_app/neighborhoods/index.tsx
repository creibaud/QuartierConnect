import { useState } from "react";
import {
    Add01Icon,
    Building01Icon,
    CheckmarkCircle01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
    useCreateNeighborhood,
    useDeleteNeighborhood,
    useNeighborhoods,
    useUpdateNeighborhood,
} from "@workspace/shared/lib/hooks/neighborhoods.hooks";
import type { Neighborhood } from "@workspace/shared/lib/types";
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
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@workspace/ui/components/table";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/neighborhoods/")({
    component: NeighborhoodsPage,
});

function NeighborhoodsPage() {
    const { t } = useTranslation();
    const [createOpen, setCreateOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Neighborhood | null>(null);

    const { data, isLoading, isError, refetch } = useNeighborhoods();
    const neighborhoods = data ?? [];
    const deleteNeighborhood = useDeleteNeighborhood();

    function handleDelete(id: string) {
        deleteNeighborhood.mutate(id, {
            onSuccess: () =>
                toast.success(t("adminPages.neighborhoods.deleted")),
            onError: () => toast.error(t("adminPages.common.deleteError")),
        });
    }

    return (
        <div className="p-6">
            <div className="mx-auto flex max-w-6xl flex-col gap-6">
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
                                    <HugeiconsIcon icon={Building01Icon} />
                                </EmptyMedia>
                                <EmptyTitle>
                                    {t("adminPages.neighborhoods.emptyTitle")}
                                </EmptyTitle>
                                <EmptyDescription>
                                    {t(
                                        "adminPages.neighborhoods.emptyDescription",
                                    )}
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
                    <div className="bg-card rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>
                                        {t("adminPages.common.name")}
                                    </TableHead>
                                    <TableHead>
                                        {t("adminPages.neighborhoods.city")}
                                    </TableHead>
                                    <TableHead>
                                        {t("adminPages.neighborhoods.polygon")}
                                    </TableHead>
                                    <TableHead className="text-right">
                                        {t("adminPages.common.actions")}
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {neighborhoods.map((nbh) => (
                                    <TableRow key={nbh._id}>
                                        <TableCell className="font-medium">
                                            {nbh.name}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {nbh.city}
                                        </TableCell>
                                        <TableCell>
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
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        setEditTarget(nbh)
                                                    }
                                                >
                                                    {t("adminPages.common.edit")}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-destructive hover:text-destructive"
                                                    disabled={
                                                        deleteNeighborhood.isPending
                                                    }
                                                    onClick={() =>
                                                        handleDelete(nbh._id)
                                                    }
                                                >
                                                    {deleteNeighborhood.isPending
                                                        ? "…"
                                                        : t("common.delete")}
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
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
        </div>
    );
}

function PolygonEditor({
    initialGeometry,
    others,
    currentGeometry,
    onChange,
}: {
    initialGeometry?: GeoJSON.Polygon;
    others: Neighborhood[];
    currentGeometry: GeoJSON.Polygon | null;
    onChange: (geometry: GeoJSON.Polygon | null) => void;
}) {
    const { t } = useTranslation();
    return (
        <div className="space-y-2">
            <Label>{t("adminPages.neighborhoods.polygonOnMap")}</Label>
            <p className="text-muted-foreground text-xs">
                {t("adminPages.neighborhoods.polygonHint")}
            </p>
            <Map
                center={[48.8566, 2.3522]}
                zoom={13}
                className="h-80 w-full"
            >
                {others.map((n) =>
                    n.geometry ? (
                        <NeighborhoodPolygon
                            key={n._id}
                            geometry={n.geometry as GeoJSON.Polygon}
                            color="#71717a"
                            label={n.name}
                        />
                    ) : null,
                )}
                {currentGeometry ? (
                    <NeighborhoodPolygon
                        geometry={currentGeometry}
                        color="#16a34a"
                    />
                ) : initialGeometry ? (
                    <NeighborhoodPolygon
                        geometry={initialGeometry}
                        color="#16a34a"
                    />
                ) : null}
                <DrawControl
                    mode="polygon"
                    onCreate={onChange}
                    onEdit={onChange}
                    onDelete={() => onChange(null)}
                />
            </Map>
        </div>
    );
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
                    onError: (err: Error) =>
                        toast.error(
                            err.message ??
                                t("adminPages.neighborhoods.updateError"),
                        ),
                },
            );
        } else {
            createNeighborhood.mutate(payload, {
                onSuccess: () => {
                    toast.success(t("adminPages.neighborhoods.created"));
                    onSuccess();
                },
                onError: (err: Error) =>
                    toast.error(
                        err.message ??
                            t("adminPages.neighborhoods.createError"),
                    ),
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
                            currentGeometry={geometry}
                            onChange={setGeometry}
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
                            {isPending
                                ? "…"
                                : initial
                                  ? t("common.save")
                                  : t("adminPages.common.create")}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
