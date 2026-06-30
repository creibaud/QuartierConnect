import { useMemo } from "react";
import { MapsLocation01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useMyLocation } from "@/features/onboarding/hooks/address.hooks";
import { Button } from "@workspace/ui/components/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components/card";
import {
    Map,
    MapControls,
    Marker,
    NeighborhoodPolygon,
    useFitBounds,
    type LatLng,
} from "@workspace/ui/components/map";

export function NeighborhoodMapCard() {
    const { t } = useTranslation();
    const { data: location, isLoading } = useMyLocation();

    const geometry = location?.neighborhood?.geometry ?? null;

    const polygonPositions = useMemo<LatLng[]>(() => {
        if (!geometry) return [];
        return geometry.coordinates[0].map(
            ([lng, lat]) => [lat, lng] as LatLng,
        );
    }, [geometry]);

    const mapRef = useFitBounds(polygonPositions);

    if (isLoading) return null;

    const hasMap =
        location?.lat != null &&
        location?.lng != null &&
        geometry != null;

    if (!hasMap) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <HugeiconsIcon
                            icon={MapsLocation01Icon}
                            className="text-primary size-5"
                        />
                        {t("pages.account.neighborhoodMap")}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <p className="text-muted-foreground text-sm">
                        {t("pages.account.noMapAvailable")}
                    </p>
                    <Button variant="outline" size="sm" asChild>
                        <Link to="/onboarding/address">
                            {t("pages.account.setAddress")}
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        );
    }

    const homePosition: LatLng = [location.lat!, location.lng!];

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <HugeiconsIcon
                        icon={MapsLocation01Icon}
                        className="text-primary size-5"
                    />
                    {t("pages.account.neighborhoodMap")}
                    {location.neighborhood?.name && (
                        <span className="text-muted-foreground ml-1 text-sm font-normal">
                            — {location.neighborhood.name}
                        </span>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {/* isolate creates a new stacking context so Leaflet's high z-indexes
                    (400–1000) are contained within this wrapper and cannot paint
                    over the sticky app header (z-20). */}
                <div className="relative isolate">
                    <Map
                        ref={mapRef}
                        center={homePosition}
                        zoom={14}
                        className="h-[420px] w-full"
                    >
                        <NeighborhoodPolygon
                            geometry={
                                geometry as unknown as GeoJSON.Polygon
                            }
                            label={location.neighborhood?.name}
                        />
                        <Marker
                            position={homePosition}
                            popup={t("pages.account.homeMarker")}
                        />
                        <MapControls
                            home={homePosition}
                            fitGeometry={geometry as unknown as GeoJSON.Polygon}
                        />
                    </Map>
                </div>
            </CardContent>
        </Card>
    );
}
