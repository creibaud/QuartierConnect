import { useState } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ensureAuthenticated } from "@workspace/shared/lib/api";
import { centroidOf } from "@workspace/shared/lib/geo";
import {
    useInfiniteIncidents,
    useUpdateIncidentStatus,
} from "@workspace/shared/lib/hooks/incidents.hooks";
import { useNeighborhoods } from "@workspace/shared/lib/hooks/neighborhoods.hooks";
import type { Incident, Neighborhood } from "@workspace/shared/lib/types";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
    Map,
    Marker,
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

const NEXT_STATUSES: Record<
    string,
    Array<"open" | "in_progress" | "resolved">
> = {
    open: ["in_progress"],
    in_progress: ["resolved"],
    resolved: [],
};

export const Route = createFileRoute("/incidents/")({
    beforeLoad: async () => {
        const user = await ensureAuthenticated();
        if (!user)
            throw redirect({ to: "/login", search: { forbidden: false } });
        if (user.role !== "admin")
            throw redirect({ to: "/login", search: { forbidden: true } });
    },
    component: AdminIncidentsPage,
});

function AdminIncidentsPage() {
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const { data, isLoading, isError, fetchNextPage, hasNextPage } =
        useInfiniteIncidents(20, statusFilter);
    const updateStatus = useUpdateIncidentStatus();
    const incidents = data?.pages.flat() ?? [];
    const { data: neighborhoods } = useNeighborhoods();

    return (
        <div className="min-h-screen bg-zinc-50 p-6 dark:bg-zinc-950">
            <div className="mx-auto max-w-5xl space-y-6">
                <header className="flex items-center justify-between">
                    <div className="space-y-1">
                        <h1 className="text-xl font-semibold">
                            Modération incidents
                        </h1>
                        <Link
                            to="/dashboard"
                            className="text-muted-foreground text-sm hover:underline"
                        >
                            ← Tableau de bord
                        </Link>
                    </div>
                    <Select
                        value={statusFilter}
                        onValueChange={setStatusFilter}
                    >
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder="Tous les statuts" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tous</SelectItem>
                            <SelectItem value="open">Ouverts</SelectItem>
                            <SelectItem value="in_progress">
                                En cours
                            </SelectItem>
                            <SelectItem value="resolved">Résolus</SelectItem>
                        </SelectContent>
                    </Select>
                </header>

                <Tabs defaultValue="list">
                    <TabsList>
                        <TabsTrigger value="list">Liste</TabsTrigger>
                        <TabsTrigger value="map">Carte</TabsTrigger>
                    </TabsList>
                    <TabsContent value="list">
                {isLoading ? (
                    <div className="space-y-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full rounded" />
                        ))}
                    </div>
                ) : isError ? (
                    <p className="text-destructive text-sm">
                        Erreur de chargement. Réessayez.
                    </p>
                ) : incidents.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                        Aucun incident.
                    </p>
                ) : (
                    <div className="rounded-lg border bg-white dark:bg-zinc-900">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Titre</TableHead>
                                    <TableHead>Statut</TableHead>
                                    <TableHead>Signalé le</TableHead>
                                    <TableHead className="text-right">
                                        Action
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {incidents.map((incident: Incident) => (
                                    <TableRow key={incident.id}>
                                        <TableCell className="max-w-xs truncate font-medium">
                                            {incident.title}
                                        </TableCell>
                                        <TableCell>
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
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {new Date(
                                                incident.createdAt,
                                            ).toLocaleDateString("fr-FR")}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {NEXT_STATUSES[incident.status]
                                                ?.length > 0 ? (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 text-xs"
                                                    disabled={
                                                        updateStatus.isPending
                                                    }
                                                    onClick={() =>
                                                        updateStatus.mutate(
                                                            {
                                                                id: incident.id,
                                                                status: NEXT_STATUSES[
                                                                    incident
                                                                        .status
                                                                ][0],
                                                            },
                                                            {
                                                                onSuccess: () =>
                                                                    toast.success(
                                                                        "Statut mis à jour",
                                                                    ),
                                                                onError: () =>
                                                                    toast.error(
                                                                        "Impossible de changer le statut",
                                                                    ),
                                                            },
                                                        )
                                                    }
                                                >
                                                    {updateStatus.isPending
                                                        ? "…"
                                                        : `→ ${STATUS_LABELS[NEXT_STATUSES[incident.status][0]]}`}
                                                </Button>
                                            ) : (
                                                <span className="text-muted-foreground text-xs">
                                                    Terminé
                                                </span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        {hasNextPage && (
                            <div className="border-t p-4">
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => fetchNextPage()}
                                >
                                    Voir plus
                                </Button>
                            </div>
                        )}
                    </div>
                )}
                    </TabsContent>
                    <TabsContent value="map">
                        <IncidentsMap
                            incidents={incidents}
                            neighborhoods={neighborhoods ?? []}
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

function IncidentsMap({
    incidents,
    neighborhoods,
}: {
    incidents: Incident[];
    neighborhoods: Neighborhood[];
}) {
    const firstNeighborhood = neighborhoods.find((n) => n.geometry);
    const incidentsWithCoords = incidents.filter(
        (i) => i.lat !== null && i.lng !== null,
    );
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
            {incidentsWithCoords.map((inc) => (
                <Marker
                    key={inc.id}
                    variant="incident"
                    position={[inc.lat!, inc.lng!]}
                    popup={
                        <div className="space-y-1">
                            <p className="font-medium">{inc.title}</p>
                            <p className="text-xs">
                                Statut :{" "}
                                {STATUS_LABELS[inc.status] ?? inc.status}
                            </p>
                        </div>
                    }
                />
            ))}
        </Map>
    );
}
