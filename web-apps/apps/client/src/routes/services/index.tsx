import { useState } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ensureAuthenticated } from "@workspace/shared/lib/api";
import { centroidOf, pointToLatLng } from "@workspace/shared/lib/geo";
import { useNeighborhoods } from "@workspace/shared/lib/hooks/neighborhoods.hooks";
import { useInfiniteServices } from "@workspace/shared/lib/hooks/services.hooks";
import {
    useCastVote,
    useVoteScore,
} from "@workspace/shared/lib/hooks/useVotes";
import { Button } from "@workspace/ui/components/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components/card";
import {
    Map,
    Marker,
    MarkerCluster,
    NeighborhoodPolygon,
    UserLocation,
} from "@workspace/ui/components/map";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@workspace/ui/components/select";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { toast } from "sonner";

export const Route = createFileRoute("/services/")({
    beforeLoad: async () => {
        const user = await ensureAuthenticated();
        if (!user) throw redirect({ to: "/login" });
    },
    component: ServicesPage,
});

function ServicesPage() {
    const [selectedNeighborhood, setSelectedNeighborhood] =
        useState<string>("all");
    const { data: neighborhoodsData } = useNeighborhoods();
    const neighborhoods = neighborhoodsData ?? [];

    const { data, isLoading, isError, fetchNextPage, hasNextPage } =
        useInfiniteServices(selectedNeighborhood);
    const services = data?.pages.flat() ?? [];
    const servicesWithCoords = services.filter((s) => s.location);
    const focusedNeighborhood =
        selectedNeighborhood !== "all"
            ? neighborhoods.find((n) => n._id === selectedNeighborhood)
            : neighborhoods.find((n) => n.geometry);

    function handleFilterChange(value: string) {
        setSelectedNeighborhood(value);
    }

    return (
        <div className="min-h-screen bg-zinc-50 p-6 dark:bg-zinc-950">
            <div className="mx-auto max-w-2xl space-y-6">
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
                    {neighborhoods.length > 0 && (
                        <Select
                            value={selectedNeighborhood}
                            onValueChange={handleFilterChange}
                        >
                            <SelectTrigger className="w-48">
                                <SelectValue placeholder="Tous les quartiers" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    Tous les quartiers
                                </SelectItem>
                                {neighborhoods.map((n) => (
                                    <SelectItem key={n._id} value={n._id}>
                                        {n.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </header>

                {focusedNeighborhood?.geometry && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                Services à proximité
                            </CardTitle>
                            <CardDescription>
                                {servicesWithCoords.length} service(s)
                                localisé(s)
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Map
                                center={centroidOf(
                                    focusedNeighborhood.geometry,
                                )}
                                zoom={14}
                                className="h-[420px] w-full"
                            >
                                <NeighborhoodPolygon
                                    geometry={focusedNeighborhood.geometry}
                                    label={focusedNeighborhood.name}
                                />
                                <UserLocation
                                    fallbackCenter={centroidOf(
                                        focusedNeighborhood.geometry,
                                    )}
                                />
                                <MarkerCluster>
                                    {servicesWithCoords.map((s) => (
                                        <Marker
                                            key={s._id}
                                            variant="service"
                                            position={pointToLatLng(s.location!)}
                                            popup={
                                                <div className="space-y-1">
                                                    <p className="font-medium">
                                                        {s.title}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {s.category}
                                                    </p>
                                                </div>
                                            }
                                        />
                                    ))}
                                </MarkerCluster>
                            </Map>
                        </CardContent>
                    </Card>
                )}

                {isLoading ? (
                    <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton
                                key={i}
                                className="h-24 w-full rounded-lg"
                            />
                        ))}
                    </div>
                ) : isError ? (
                    <p className="text-destructive text-sm">
                        Erreur de chargement. Réessayez.
                    </p>
                ) : services.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                        Aucun service disponible.
                    </p>
                ) : (
                    <div className="space-y-3">
                        {services.map((service) => (
                            <Card key={service._id}>
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm font-medium">
                                            {service.title}
                                        </CardTitle>
                                        <span className="text-muted-foreground text-xs">
                                            {service.category}
                                        </span>
                                    </div>
                                    {service.address && (
                                        <CardDescription>
                                            {service.address}
                                        </CardDescription>
                                    )}
                                </CardHeader>
                                <CardContent className="space-y-2 pt-0">
                                    {service.description && (
                                        <p className="text-muted-foreground line-clamp-2 text-sm">
                                            {service.description}
                                        </p>
                                    )}
                                    <ServiceVote serviceId={service._id} />
                                </CardContent>
                            </Card>
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
            </div>
        </div>
    );
}

function ServiceVote({ serviceId }: { serviceId: string }) {
    const { data: voteScore } = useVoteScore(serviceId, "service");
    const castVote = useCastVote();
    const breakdown = voteScore?.breakdown as
        | { like?: number; dislike?: number }
        | undefined;

    return (
        <div className="flex items-center gap-2 pt-1">
            <button
                type="button"
                disabled={castVote.isPending}
                onClick={() =>
                    castVote.mutate(
                        {
                            targetId: serviceId,
                            targetType: "service",
                            voteType: "like",
                        },
                        { onError: () => toast.error("Impossible de voter") },
                    )
                }
                className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors disabled:opacity-50"
            >
                👍 {breakdown?.like ?? 0}
            </button>
            <button
                type="button"
                disabled={castVote.isPending}
                onClick={() =>
                    castVote.mutate(
                        {
                            targetId: serviceId,
                            targetType: "service",
                            voteType: "dislike",
                        },
                        { onError: () => toast.error("Impossible de voter") },
                    )
                }
                className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors disabled:opacity-50"
            >
                👎 {breakdown?.dislike ?? 0}
            </button>
        </div>
    );
}
