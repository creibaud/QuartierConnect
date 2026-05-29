import { useState } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ensureAuthenticated } from "@workspace/shared/lib/api";
import { centroidOf } from "@workspace/shared/lib/geo";
import {
    useCreateIncident,
    useInfiniteIncidents,
} from "@workspace/shared/lib/hooks/incidents.hooks";
import { useNeighborhoods } from "@workspace/shared/lib/hooks/neighborhoods.hooks";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
    Map,
    MapClickHandler,
    Marker,
    NeighborhoodPolygon,
} from "@workspace/ui/components/map";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Textarea } from "@workspace/ui/components/textarea";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, string> = {
    open: "Ouvert",
    in_progress: "En cours",
    resolved: "Résolu",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
    open: "default",
    in_progress: "secondary",
    resolved: "outline",
};

export const Route = createFileRoute("/incidents/")({
    beforeLoad: async () => {
        const user = await ensureAuthenticated();
        if (!user) throw redirect({ to: "/login" });
    },
    component: IncidentsPage,
});

function IncidentsPage() {
    const [createOpen, setCreateOpen] = useState(false);
    const { data, isLoading, isError, fetchNextPage, hasNextPage } =
        useInfiniteIncidents();
    const incidents = data?.pages.flat() ?? [];
    const { data: neighborhoods } = useNeighborhoods();
    const firstNeighborhood = neighborhoods?.find((n) => n.geometry);
    const incidentsWithCoords = incidents.filter(
        (i) => i.lat !== null && i.lng !== null,
    );

    return (
        <div className="min-h-screen bg-zinc-50 p-6 dark:bg-zinc-950">
            <div className="mx-auto max-w-2xl space-y-6">
                <header className="flex items-center justify-between">
                    <div className="space-y-1">
                        <h1 className="text-xl font-semibold">Incidents</h1>
                        <Link
                            to="/dashboard"
                            className="text-muted-foreground text-sm hover:underline"
                        >
                            ← Tableau de bord
                        </Link>
                    </div>
                    <Button size="sm" onClick={() => setCreateOpen(true)}>
                        Signaler un incident
                    </Button>
                </header>

                {firstNeighborhood?.geometry && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                Carte des incidents
                            </CardTitle>
                            <CardDescription>
                                {incidentsWithCoords.length} incident(s)
                                localisé(s)
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Map
                                center={centroidOf(firstNeighborhood.geometry)}
                                zoom={14}
                                className="h-[400px] w-full"
                            >
                                {neighborhoods?.map((n) =>
                                    n.geometry ? (
                                        <NeighborhoodPolygon
                                            key={n._id}
                                            geometry={n.geometry}
                                            label={n.name}
                                        />
                                    ) : null,
                                )}
                                {incidentsWithCoords.map((inc) => (
                                    <Marker
                                        key={inc.id}
                                        variant="incident"
                                        position={[inc.lat!, inc.lng!]}
                                        popup={
                                            <div className="space-y-1">
                                                <p className="font-medium">
                                                    {inc.title}
                                                </p>
                                                <p className="text-xs">
                                                    Statut :{" "}
                                                    {STATUS_LABELS[
                                                        inc.status
                                                    ] ?? inc.status}
                                                </p>
                                            </div>
                                        }
                                    />
                                ))}
                            </Map>
                        </CardContent>
                    </Card>
                )}

                {isLoading ? (
                    <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton
                                key={i}
                                className="h-20 w-full rounded-lg"
                            />
                        ))}
                    </div>
                ) : isError ? (
                    <p className="text-destructive text-sm">
                        Erreur de chargement. Réessayez.
                    </p>
                ) : incidents.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                        Aucun incident signalé pour le moment.
                    </p>
                ) : (
                    <div className="space-y-3">
                        {incidents.map((incident) => (
                            <Link
                                key={incident.id}
                                to="/incidents/$id"
                                params={{ id: incident.id }}
                            >
                                <Card className="hover:bg-muted/50 cursor-pointer transition-colors">
                                    <CardHeader className="pb-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <CardTitle className="text-sm font-medium">
                                                {incident.title}
                                            </CardTitle>
                                            <Badge
                                                variant={
                                                    STATUS_VARIANTS[
                                                        incident.status
                                                    ] ?? "outline"
                                                }
                                            >
                                                {STATUS_LABELS[
                                                    incident.status
                                                ] ?? incident.status}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    {incident.description && (
                                        <CardContent className="pt-0">
                                            <p className="text-muted-foreground line-clamp-2 text-sm">
                                                {incident.description}
                                            </p>
                                        </CardContent>
                                    )}
                                </Card>
                            </Link>
                        ))}

                        {hasNextPage && (
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => fetchNextPage()}
                            >
                                Voir plus
                            </Button>
                        )}
                    </div>
                )}

                <CreateIncidentDialog
                    open={createOpen}
                    onOpenChange={setCreateOpen}
                    onSuccess={() => setCreateOpen(false)}
                />
            </div>
        </div>
    );
}

function CreateIncidentDialog({
    open,
    onOpenChange,
    onSuccess,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [pickedLat, setPickedLat] = useState<number | null>(null);
    const [pickedLng, setPickedLng] = useState<number | null>(null);
    const createIncident = useCreateIncident();
    const { data: neighborhoods } = useNeighborhoods();
    const firstNeighborhood = neighborhoods?.find((n) => n.geometry);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!title.trim()) return;
        createIncident.mutate(
            {
                title: title.trim(),
                description: description.trim() || undefined,
                lat: pickedLat ?? undefined,
                lng: pickedLng ?? undefined,
            },
            {
                onSuccess: () => {
                    toast.success("Incident signalé");
                    setTitle("");
                    setDescription("");
                    setPickedLat(null);
                    setPickedLng(null);
                    onSuccess();
                },
                onError: () => toast.error("Impossible de signaler l'incident"),
            },
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Signaler un incident</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="incident-title">Titre *</Label>
                        <Input
                            id="incident-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Ex : Lampadaire cassé rue de la Paix"
                            maxLength={255}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="incident-description">
                            Description
                        </Label>
                        <Textarea
                            id="incident-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Décrivez l'incident en détail…"
                            rows={3}
                        />
                    </div>
                    {firstNeighborhood?.geometry && (
                        <div className="space-y-2">
                            <Label>
                                Lieu — cliquez sur la carte
                                {pickedLat !== null && pickedLng !== null
                                    ? ` (${pickedLat.toFixed(4)}, ${pickedLng.toFixed(4)})`
                                    : " (optionnel)"}
                            </Label>
                            <Map
                                center={centroidOf(firstNeighborhood.geometry)}
                                zoom={15}
                                className="h-64"
                            >
                                <NeighborhoodPolygon
                                    geometry={firstNeighborhood.geometry}
                                />
                                <MapClickHandler
                                    onClick={(lat, lng) => {
                                        setPickedLat(lat);
                                        setPickedLng(lng);
                                    }}
                                />
                                {pickedLat !== null && pickedLng !== null && (
                                    <Marker
                                        variant="incident"
                                        position={[pickedLat, pickedLng]}
                                    />
                                )}
                            </Map>
                        </div>
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
                            disabled={createIncident.isPending || !title.trim()}
                        >
                            {createIncident.isPending ? "Envoi…" : "Signaler"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
