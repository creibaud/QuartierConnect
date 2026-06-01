import { useState } from "react";
import {
    CustomerServiceIcon,
    ThumbsDownIcon,
    ThumbsUpIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute } from "@tanstack/react-router";
import { centroidOf, pointToLatLng } from "@workspace/shared/lib/geo";
import { useNeighborhoods } from "@workspace/shared/lib/hooks/neighborhoods.hooks";
import { useInfiniteServices } from "@workspace/shared/lib/hooks/services.hooks";
import {
    useCastVote,
    useVoteScore,
} from "@workspace/shared/lib/hooks/useVotes";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components/card";
import { DataState } from "@workspace/ui/components/data-state";
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@workspace/ui/components/empty";
import {
    Map,
    Marker,
    MarkerCluster,
    NeighborhoodPolygon,
    UserLocation,
} from "@workspace/ui/components/map";
import { PageHeader } from "@workspace/ui/components/page-header";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@workspace/ui/components/select";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/services/")({
    component: ServicesPage,
});

function ServicesPage() {
    const [selectedNeighborhood, setSelectedNeighborhood] =
        useState<string>("all");
    const { data: neighborhoodsData } = useNeighborhoods();
    const neighborhoods = neighborhoodsData ?? [];

    const { data, isLoading, isError, fetchNextPage, hasNextPage, refetch } =
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
        <div className="p-6 md:p-8">
            <div className="mx-auto flex max-w-5xl flex-col gap-6">
                <PageHeader
                    title="Services"
                    description="L'annuaire des services et commerces de votre quartier."
                    actions={
                        neighborhoods.length > 0 ? (
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
                        ) : undefined
                    }
                />

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

                <DataState
                    loading={isLoading}
                    error={isError ? true : undefined}
                    isEmpty={services.length === 0}
                    onRetry={() => void refetch()}
                    skeleton={
                        <div className="grid gap-4 sm:grid-cols-2">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton
                                    key={i}
                                    className="h-32 w-full rounded-xl"
                                />
                            ))}
                        </div>
                    }
                    empty={
                        <Empty className="border">
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <HugeiconsIcon icon={CustomerServiceIcon} />
                                </EmptyMedia>
                                <EmptyTitle>Aucun service disponible</EmptyTitle>
                                <EmptyDescription>
                                    Aucun service n'est répertorié pour ce
                                    quartier pour le moment.
                                </EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    }
                >
                    <div className="grid gap-4 sm:grid-cols-2">
                        {services.map((service) => (
                            <Card key={service._id}>
                                <CardHeader>
                                    <div className="flex items-start justify-between gap-2">
                                        <CardTitle className="text-base">
                                            {service.title}
                                        </CardTitle>
                                        <Badge
                                            variant="secondary"
                                            className="shrink-0"
                                        >
                                            {service.category}
                                        </Badge>
                                    </div>
                                    {service.address && (
                                        <CardDescription>
                                            {service.address}
                                        </CardDescription>
                                    )}
                                </CardHeader>
                                <CardContent className="flex flex-col gap-3">
                                    {service.description && (
                                        <p className="text-muted-foreground line-clamp-2 text-sm">
                                            {service.description}
                                        </p>
                                    )}
                                    <ServiceVote serviceId={service._id} />
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {hasNextPage && (
                        <Button
                            variant="outline"
                            className="mt-4 w-full"
                            onClick={() => fetchNextPage()}
                        >
                            Voir plus
                        </Button>
                    )}
                </DataState>
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
        <div className="flex items-center gap-1">
            <Button
                type="button"
                variant="ghost"
                size="sm"
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
                className="text-muted-foreground"
            >
                <HugeiconsIcon icon={ThumbsUpIcon} />
                <span className="tabular-nums">{breakdown?.like ?? 0}</span>
            </Button>
            <Button
                type="button"
                variant="ghost"
                size="sm"
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
                className="text-muted-foreground"
            >
                <HugeiconsIcon icon={ThumbsDownIcon} />
                <span className="tabular-nums">{breakdown?.dislike ?? 0}</span>
            </Button>
        </div>
    );
}
