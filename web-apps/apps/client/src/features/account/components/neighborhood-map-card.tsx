import { useEffect, useMemo, useState } from "react";
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
    Marker,
    NeighborhoodPolygon,
    useFitBounds,
    type LatLng,
} from "@workspace/ui/components/map";

type GeolocationState =
    | { status: "idle" }
    | { status: "pending" }
    | { status: "granted"; lat: number; lng: number; accuracy: number }
    | { status: "denied" }
    | { status: "error" };

export function NeighborhoodMapCard() {
    const { t } = useTranslation();
    const { data: location, isLoading } = useMyLocation();
    const [geoState, setGeoState] = useState<GeolocationState>({
        status: "idle",
    });

    const geometry = location?.neighborhood?.geometry ?? null;

    const polygonPositions = useMemo<LatLng[]>(() => {
        if (!geometry) return [];
        return geometry.coordinates[0].map(
            ([lng, lat]) => [lat, lng] as LatLng,
        );
    }, [geometry]);

    const mapRef = useFitBounds(polygonPositions);

    useEffect(() => {
        if (geoState.status !== "granted") return;
        mapRef.current?.flyTo([geoState.lat, geoState.lng], 15);
    }, [geoState, mapRef]);

    function locateMe() {
        if (!navigator.geolocation) {
            setGeoState({ status: "denied" });
            return;
        }
        setGeoState({ status: "pending" });
        navigator.geolocation.getCurrentPosition(
            (pos) =>
                setGeoState({
                    status: "granted",
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    accuracy: pos.coords.accuracy,
                }),
            (err) => {
                setGeoState({
                    status:
                        err.code === err.PERMISSION_DENIED ? "denied" : "error",
                });
            },
            { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
        );
    }

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
                        className="h-64 w-full"
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
                        {geoState.status === "granted" && (
                            <Marker
                                position={[geoState.lat, geoState.lng]}
                                variant="service"
                                popup={t("pages.account.myLocationMarker")}
                            />
                        )}
                    </Map>
                    <div className="absolute top-2 right-2 z-[1000] flex flex-col items-end gap-1">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={locateMe}
                            disabled={geoState.status === "pending"}
                            className="bg-background/90 shadow-sm backdrop-blur-sm"
                        >
                            {geoState.status === "pending"
                                ? t("common.loading")
                                : t("pages.account.locateMe")}
                        </Button>
                        {geoState.status === "denied" && (
                            <p className="bg-background/90 rounded px-2 py-1 text-xs text-muted-foreground backdrop-blur-sm">
                                {t("pages.account.locationDenied")}
                            </p>
                        )}
                        {geoState.status === "error" && (
                            <p className="bg-background/90 rounded px-2 py-1 text-xs text-muted-foreground backdrop-blur-sm">
                                {t("pages.account.locationError")}
                            </p>
                        )}
                    </div>
                </div>
                {geoState.status === "granted" && geoState.accuracy > 1000 && (
                    <p className="text-muted-foreground text-xs">
                        {t("pages.account.locationApproximate", {
                            km: Math.round(geoState.accuracy / 1000),
                        })}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
