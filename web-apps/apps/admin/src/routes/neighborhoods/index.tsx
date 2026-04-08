import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ensureAuthenticated } from "@workspace/shared/lib/api";
import {
    useCreateNeighborhood,
    useDeleteNeighborhood,
    useNeighborhoods,
    useUpdateNeighborhood,
} from "@workspace/shared/lib/hooks/neighborhoods.hooks";
import type { Neighborhood } from "@workspace/shared/lib/types";
import { Button } from "@workspace/ui/components/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
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
import "leaflet/dist/leaflet.css";

export const Route = createFileRoute("/neighborhoods/")({
    beforeLoad: async () => {
        const user = await ensureAuthenticated();
        if (!user)
            throw redirect({ to: "/login", search: { forbidden: false } });
        if (user.role !== "admin")
            throw redirect({ to: "/login", search: { forbidden: true } });
    },
    component: NeighborhoodsPage,
});

function NeighborhoodsPage() {
    const [createOpen, setCreateOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Neighborhood | null>(null);

    const { data, isLoading, isError } = useNeighborhoods();
    const neighborhoods = data ?? [];
    const deleteNeighborhood = useDeleteNeighborhood();

    function handleDelete(id: string) {
        deleteNeighborhood.mutate(id, {
            onSuccess: () => toast.success("Quartier supprimé"),
            onError: () => toast.error("Impossible de supprimer"),
        });
    }

    return (
        <div className="min-h-screen bg-zinc-50 p-6 dark:bg-zinc-950">
            <div className="mx-auto max-w-5xl space-y-6">
                <header className="flex items-center justify-between">
                    <div className="space-y-1">
                        <h1 className="text-xl font-semibold">Quartiers</h1>
                        <Link
                            to="/dashboard"
                            className="text-muted-foreground text-sm hover:underline"
                        >
                            ← Tableau de bord
                        </Link>
                    </div>
                    <Button size="sm" onClick={() => setCreateOpen(true)}>
                        Ajouter
                    </Button>
                </header>

                {isLoading ? (
                    <div className="space-y-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full rounded" />
                        ))}
                    </div>
                ) : isError ? (
                    <p className="text-destructive text-sm">
                        Erreur de chargement.
                    </p>
                ) : neighborhoods.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                        Aucun quartier.
                    </p>
                ) : (
                    <div className="rounded-lg border bg-white dark:bg-zinc-900">
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
                                                <span className="text-xs font-medium text-green-600">
                                                    ✓ Défini
                                                </span>
                                            ) : (
                                                <span className="text-xs text-amber-600">
                                                    Non défini
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 text-xs"
                                                    onClick={() =>
                                                        setEditTarget(nbh)
                                                    }
                                                >
                                                    Modifier
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    className="h-8 text-xs"
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
                )}

                <NeighborhoodDialog
                    open={createOpen}
                    onOpenChange={setCreateOpen}
                    onSuccess={() => setCreateOpen(false)}
                />

                {editTarget && (
                    <NeighborhoodDialog
                        key={editTarget._id}
                        open
                        initial={editTarget}
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

interface GeoJsonPolygon {
    type: "Polygon";
    coordinates: number[][][];
}

function PolygonMap({
    initialGeometry,
    onChange,
}: {
    initialGeometry?: GeoJsonPolygon;
    onChange: (geometry: GeoJsonPolygon | null) => void;
}) {
    const mapRef = useRef<HTMLDivElement>(null);
    const leafletMapRef = useRef<import("leaflet").Map | null>(null);
    const drawnLayersRef = useRef<import("leaflet").LayerGroup | null>(null);
    const [leafletReady, setLeafletReady] = useState(false);

    useEffect(() => {
        if (!mapRef.current || leafletMapRef.current) return;

        void (async () => {
            const L = (await import("leaflet")).default;
            const { default: iconRetinaUrl } =
                await import("leaflet/dist/images/marker-icon-2x.png");
            const { default: iconUrl } =
                await import("leaflet/dist/images/marker-icon.png");
            const { default: shadowUrl } =
                await import("leaflet/dist/images/marker-shadow.png");

            L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });

            const map = L.map(mapRef.current!).setView([48.8566, 2.3522], 13);
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: "© OpenStreetMap contributors",
            }).addTo(map);

            const drawnLayers = L.layerGroup().addTo(map);
            leafletMapRef.current = map;
            drawnLayersRef.current = drawnLayers;

            if (initialGeometry?.coordinates?.[0]) {
                const latlngs = initialGeometry.coordinates[0].map(
                    ([lng, lat]) => [lat, lng] as [number, number],
                );
                const polygon = L.polygon(latlngs, { color: "#2563eb" });
                drawnLayers.addLayer(polygon);
                map.fitBounds(polygon.getBounds());
            }

            let drawingPoints: import("leaflet").LatLng[] = [];
            let previewLine: import("leaflet").Polyline | null = null;

            map.on("click", (e) => {
                drawingPoints.push(e.latlng);
                if (previewLine) map.removeLayer(previewLine);
                previewLine = L.polyline(drawingPoints, {
                    color: "#2563eb",
                    dashArray: "5,5",
                }).addTo(map);
            });

            map.on("dblclick", (e) => {
                e.originalEvent.preventDefault();
                if (drawingPoints.length < 3) return;

                if (previewLine) {
                    map.removeLayer(previewLine);
                    previewLine = null;
                }

                drawnLayers.clearLayers();
                const polygon = L.polygon(drawingPoints, { color: "#2563eb" });
                drawnLayers.addLayer(polygon);

                const coordinates = [
                    [
                        ...drawingPoints.map((p) => [p.lng, p.lat]),
                        [drawingPoints[0].lng, drawingPoints[0].lat],
                    ],
                ];
                onChange({ type: "Polygon", coordinates });
                drawingPoints = [];
            });

            setLeafletReady(true);
        })();

        return () => {
            leafletMapRef.current?.remove();
            leafletMapRef.current = null;
        };
    }, []);

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <Label>Polygone sur la carte</Label>
                <button
                    type="button"
                    className="text-muted-foreground hover:text-destructive text-xs"
                    onClick={() => {
                        drawnLayersRef.current?.clearLayers();
                        onChange(null);
                    }}
                >
                    Effacer
                </button>
            </div>
            <p className="text-muted-foreground text-xs">
                Cliquez pour placer des points. Double-cliquez pour fermer le
                polygone.
            </p>
            <div
                ref={mapRef}
                className="h-64 w-full overflow-hidden rounded-md border"
                style={{ cursor: leafletReady ? "crosshair" : "default" }}
            />
        </div>
    );
}

function NeighborhoodDialog({
    open,
    initial,
    onOpenChange,
    onSuccess,
}: {
    open: boolean;
    initial?: Neighborhood;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}) {
    const [name, setName] = useState(initial?.name ?? "");
    const [city, setCity] = useState(initial?.city ?? "");
    const [description, setDescription] = useState(initial?.description ?? "");
    const [geometry, setGeometry] = useState<GeoJsonPolygon | null>(
        (initial?.geometry as GeoJsonPolygon | undefined) ?? null,
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
                        <PolygonMap
                            initialGeometry={
                                (initial?.geometry as
                                    | GeoJsonPolygon
                                    | undefined) ?? undefined
                            }
                            onChange={setGeometry}
                        />
                    )}

                    {geometry && (
                        <p className="text-xs text-green-600">
                            ✓ Polygone défini (
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
