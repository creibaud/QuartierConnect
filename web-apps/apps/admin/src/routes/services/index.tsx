import { useState } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useMapEvents } from "react-leaflet";
import { ensureAuthenticated } from "@workspace/shared/lib/api";
import { centroidOf, latLngToPoint, pointToLatLng } from "@workspace/shared/lib/geo";
import { useNeighborhoods } from "@workspace/shared/lib/hooks/neighborhoods.hooks";
import {
    useCreateService,
    useDeleteService,
    useServices,
    useUpdateService,
} from "@workspace/shared/lib/hooks/services.hooks";
import type { Neighborhood, Service } from "@workspace/shared/lib/types";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
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
    Marker,
    MarkerCluster,
    NeighborhoodPolygon,
} from "@workspace/ui/components/map";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@workspace/ui/components/select";
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
import { Textarea } from "@workspace/ui/components/textarea";
import { toast } from "sonner";

function ClickToPlace({
    onPlace,
}: {
    onPlace: (lat: number, lng: number) => void;
}) {
    useMapEvents({
        click(e) {
            onPlace(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

export const Route = createFileRoute("/services/")({
    beforeLoad: async () => {
        const user = await ensureAuthenticated();
        if (!user)
            throw redirect({ to: "/login", search: { forbidden: false } });
        if (user.role !== "admin")
            throw redirect({ to: "/login", search: { forbidden: true } });
    },
    component: AdminServicesPage,
});

function AdminServicesPage() {
    const [createOpen, setCreateOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Service | null>(null);

    const {
        data: servicesData,
        isLoading,
        isError,
    } = useServices({ limit: 100 });
    const { data: neighborhoodsData } = useNeighborhoods(100);
    const services = servicesData ?? [];
    const neighborhoods = neighborhoodsData ?? [];
    const deleteService = useDeleteService();

    const nbhMap = Object.fromEntries(
        neighborhoods.map((n) => [n._id, n.name]),
    );

    function handleDelete(id: string) {
        deleteService.mutate(id, {
            onSuccess: () => toast.success("Service supprimé"),
            onError: () => toast.error("Impossible de supprimer"),
        });
    }

    return (
        <div className="min-h-screen bg-zinc-50 p-6 dark:bg-zinc-950">
            <div className="mx-auto max-w-5xl space-y-6">
                <header className="flex items-center justify-between">
                    <div className="space-y-1">
                        <h1 className="text-xl font-semibold">Services</h1>
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

                <Tabs defaultValue="list">
                    <TabsList>
                        <TabsTrigger value="list">Liste</TabsTrigger>
                        <TabsTrigger value="map">Carte</TabsTrigger>
                    </TabsList>
                    <TabsContent value="list">
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
                ) : services.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                        Aucun service.
                    </p>
                ) : (
                    <div className="rounded-lg border bg-white dark:bg-zinc-900">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nom</TableHead>
                                    <TableHead>Catégorie</TableHead>
                                    <TableHead>Quartier</TableHead>
                                    <TableHead className="text-right">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {services.map((svc) => (
                                    <TableRow key={svc._id}>
                                        <TableCell className="font-medium">
                                            {svc.title}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">
                                                {svc.category}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {svc.neighborhoodId
                                                ? (nbhMap[svc.neighborhoodId] ??
                                                  "—")
                                                : "—"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 text-xs"
                                                    onClick={() =>
                                                        setEditTarget(svc)
                                                    }
                                                >
                                                    Modifier
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    className="h-8 text-xs"
                                                    disabled={
                                                        deleteService.isPending
                                                    }
                                                    onClick={() =>
                                                        handleDelete(svc._id)
                                                    }
                                                >
                                                    {deleteService.isPending
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
                    </TabsContent>
                    <TabsContent value="map">
                        <ServicesMap
                            services={services}
                            neighborhoods={neighborhoods}
                        />
                    </TabsContent>
                </Tabs>

                <ServiceDialog
                    open={createOpen}
                    neighborhoods={neighborhoods}
                    onOpenChange={setCreateOpen}
                    onSuccess={() => setCreateOpen(false)}
                />

                {editTarget && (
                    <ServiceDialog
                        key={editTarget._id}
                        open
                        initial={editTarget}
                        neighborhoods={neighborhoods}
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

function ServicesMap({
    services,
    neighborhoods,
}: {
    services: Service[];
    neighborhoods: Neighborhood[];
}) {
    const firstNeighborhood = neighborhoods.find((n) => n.geometry);
    const servicesWithCoords = services.filter((s) => s.location);
    const center: [number, number] = firstNeighborhood?.geometry
        ? centroidOf(firstNeighborhood.geometry)
        : [48.8566, 2.3522];
    return (
        <Map center={center} zoom={13} className="h-[600px] w-full">
            {neighborhoods.map((n) =>
                n.geometry ? (
                    <NeighborhoodPolygon
                        key={n._id}
                        geometry={n.geometry}
                        label={n.name}
                    />
                ) : null,
            )}
            <MarkerCluster>
                {servicesWithCoords.map((s) => (
                    <Marker
                        key={s._id}
                        variant="service"
                        position={pointToLatLng(s.location!)}
                        popup={
                            <div className="space-y-1">
                                <p className="font-medium">{s.title}</p>
                                <p className="text-xs">{s.category}</p>
                            </div>
                        }
                    />
                ))}
            </MarkerCluster>
        </Map>
    );
}

function ServiceDialog({
    open,
    initial,
    neighborhoods,
    onOpenChange,
    onSuccess,
}: {
    open: boolean;
    initial?: Service;
    neighborhoods: Neighborhood[];
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}) {
    const [name, setName] = useState(initial?.title ?? "");
    const [category, setCategory] = useState(initial?.category ?? "");
    const [type, setType] = useState<"free" | "paid" | "exchange">(
        (initial?.type as "free" | "paid" | "exchange") ?? "free",
    );
    const [description, setDescription] = useState(initial?.description ?? "");
    const [address, setAddress] = useState(initial?.address ?? "");
    const [neighborhoodId, setNeighborhoodId] = useState(
        initial?.neighborhoodId ?? "",
    );
    const initialCoords = initial?.location?.coordinates;
    const [pickedLat, setPickedLat] = useState<number | null>(
        initialCoords ? initialCoords[1] : null,
    );
    const [pickedLng, setPickedLng] = useState<number | null>(
        initialCoords ? initialCoords[0] : null,
    );
    const createService = useCreateService();
    const updateService = useUpdateService();
    const firstNeighborhood = neighborhoods.find((n) => n.geometry);

    const isPending = createService.isPending || updateService.isPending;

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim() || !category.trim()) return;
        const location =
            pickedLat !== null && pickedLng !== null
                ? latLngToPoint(pickedLat, pickedLng)
                : undefined;
        const payload = {
            title: name.trim(),
            category: category.trim(),
            type,
            description: description.trim() || undefined,
            address: address.trim() || undefined,
            neighborhoodId: neighborhoodId || undefined,
            location,
        };
        if (initial) {
            updateService.mutate(
                { id: initial._id, data: payload },
                {
                    onSuccess: () => {
                        toast.success("Service modifié");
                        onSuccess();
                    },
                    onError: () =>
                        toast.error("Erreur lors de l'enregistrement"),
                },
            );
        } else {
            createService.mutate(payload, {
                onSuccess: () => {
                    toast.success("Service créé");
                    onSuccess();
                },
                onError: () => toast.error("Erreur lors de l'enregistrement"),
            });
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {initial ? "Modifier le service" : "Ajouter un service"}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="svc-name">Nom *</Label>
                        <Input
                            id="svc-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex : Bibliothèque"
                            maxLength={255}
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="svc-category">Catégorie *</Label>
                            <Input
                                id="svc-category"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                placeholder="Ex : gardening"
                                maxLength={100}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Type *</Label>
                            <Select
                                value={type}
                                onValueChange={(v) =>
                                    setType(v as "free" | "paid" | "exchange")
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="free">
                                        Gratuit
                                    </SelectItem>
                                    <SelectItem value="paid">Payant</SelectItem>
                                    <SelectItem value="exchange">
                                        Échange
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="svc-address">Adresse</Label>
                        <Input
                            id="svc-address"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="Ex : 12 rue de la Paix"
                        />
                    </div>
                    {neighborhoods.length > 0 && (
                        <div className="space-y-2">
                            <Label>Quartier</Label>
                            <Select
                                value={neighborhoodId}
                                onValueChange={setNeighborhoodId}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Choisir un quartier" />
                                </SelectTrigger>
                                <SelectContent>
                                    {neighborhoods.map((n) => (
                                        <SelectItem key={n._id} value={n._id}>
                                            {n.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="svc-desc">Description</Label>
                        <Textarea
                            id="svc-desc"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                        />
                    </div>
                    {firstNeighborhood?.geometry && (
                        <div className="space-y-2">
                            <Label>
                                Position — cliquez sur la carte
                                {pickedLat !== null && pickedLng !== null
                                    ? ` (${pickedLat.toFixed(4)}, ${pickedLng.toFixed(4)})`
                                    : " (optionnel)"}
                            </Label>
                            <Map
                                center={
                                    pickedLat !== null && pickedLng !== null
                                        ? [pickedLat, pickedLng]
                                        : centroidOf(firstNeighborhood.geometry)
                                }
                                zoom={14}
                                className="h-64"
                            >
                                <NeighborhoodPolygon
                                    geometry={firstNeighborhood.geometry}
                                />
                                <ClickToPlace
                                    onPlace={(lat, lng) => {
                                        setPickedLat(lat);
                                        setPickedLng(lng);
                                    }}
                                />
                                {pickedLat !== null && pickedLng !== null && (
                                    <Marker
                                        variant="service"
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
                            disabled={
                                isPending || !name.trim() || !category.trim()
                            }
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
