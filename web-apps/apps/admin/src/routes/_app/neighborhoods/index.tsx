import { useState } from "react";
import {
    Add01Icon,
    Building01Icon,
    CheckmarkCircle01Icon,
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
    const [createOpen, setCreateOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Neighborhood | null>(null);

    const { data, isLoading, isError, refetch } = useNeighborhoods();
    const neighborhoods = data ?? [];
    const deleteNeighborhood = useDeleteNeighborhood();

    function handleDelete(id: string) {
        deleteNeighborhood.mutate(id, {
            onSuccess: () => toast.success("Quartier supprimé"),
            onError: () => toast.error("Impossible de supprimer"),
        });
    }

    return (
        <div className="p-6">
            <div className="mx-auto flex max-w-6xl flex-col gap-6">
                <PageHeader
                    title="Quartiers"
                    description="Gérez les quartiers et leurs périmètres sur la carte"
                    actions={
                        <Button onClick={() => setCreateOpen(true)}>
                            <HugeiconsIcon icon={Add01Icon} />
                            Créer
                        </Button>
                    }
                />

                <DataState
                    loading={isLoading}
                    error={isError ? true : undefined}
                    isEmpty={neighborhoods.length === 0}
                    onRetry={() => refetch()}
                    errorTitle="Impossible de charger les quartiers"
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
                                    Aucun quartier pour l&apos;instant
                                </EmptyTitle>
                                <EmptyDescription>
                                    Créez votre premier quartier et tracez son
                                    périmètre sur la carte.
                                </EmptyDescription>
                            </EmptyHeader>
                            <EmptyContent>
                                <Button onClick={() => setCreateOpen(true)}>
                                    <HugeiconsIcon icon={Add01Icon} />
                                    Créer un quartier
                                </Button>
                            </EmptyContent>
                        </Empty>
                    }
                >
                    <div className="bg-card rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nom</TableHead>
                                    <TableHead>Ville</TableHead>
                                    <TableHead>Polygone</TableHead>
                                    <TableHead className="text-right">
                                        Actions
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
                                                    Défini
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary">
                                                    Non défini
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
                                                    Modifier
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
                                                        : "Supprimer"}
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
    return (
        <div className="space-y-2">
            <Label>Polygone sur la carte</Label>
            <p className="text-muted-foreground text-xs">
                Quartiers existants en gris. Utilisez l&apos;outil polygone
                en haut à droite, cliquez pour les sommets, double-cliquez
                pour fermer.
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
                        toast.success("Quartier modifié");
                        onSuccess();
                    },
                    onError: (err: Error) =>
                        toast.error(
                            err.message ?? "Erreur lors de la modification",
                        ),
                },
            );
        } else {
            createNeighborhood.mutate(payload, {
                onSuccess: () => {
                    toast.success("Quartier créé");
                    onSuccess();
                },
                onError: (err: Error) =>
                    toast.error(err.message ?? "Erreur lors de la création"),
            });
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {initial
                            ? "Modifier le quartier"
                            : "Ajouter un quartier"}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="nbh-name">Nom *</Label>
                            <Input
                                id="nbh-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ex : Montmartre"
                                maxLength={100}
                                required
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="nbh-city">Ville *</Label>
                            <Input
                                id="nbh-city"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                placeholder="Ex : Paris"
                                maxLength={100}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="nbh-desc">Description</Label>
                        <Input
                            id="nbh-desc"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Description optionnelle"
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
                            Polygone défini (
                            {geometry.coordinates[0].length - 1} points)
                        </p>
                    )}

                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Annuler
                        </Button>
                        <Button
                            type="submit"
                            disabled={isPending || !name.trim() || !city.trim()}
                        >
                            {isPending
                                ? "…"
                                : initial
                                  ? "Enregistrer"
                                  : "Créer"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
