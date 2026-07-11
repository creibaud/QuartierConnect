import { useTranslation } from "react-i18next";
import { centroidOf, pointToLatLng } from "@workspace/shared/lib/geo";
import { useNeighborhoods } from "@workspace/shared/lib/hooks/neighborhoods.hooks";
import type { Event } from "@workspace/shared/lib/types";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components/card";
import {
    Map,
    MapControls,
    Marker,
    MarkerCluster,
    NeighborhoodPolygon,
} from "@workspace/ui/components/map";
import { useMyLocation } from "@/features/onboarding/hooks/address.hooks";
import { ParticipantCount } from "./event-participation";

export function EventsMapView({ events }: { events: Event[] }) {
    const { t, i18n } = useTranslation();
    const { data: neighborhoods } = useNeighborhoods();
    const { data: myLocation } = useMyLocation();
    const firstNeighborhood = neighborhoods?.find((n) => n.geometry);
    const eventsWithCoords = events.filter((e) => e.location);

    if (!firstNeighborhood?.geometry) {
        return (
            <p className="text-muted-foreground text-sm">
                {t("pages.events.noNeighborhoodMapped")}
            </p>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">
                    {t("pages.events.nearby")}
                </CardTitle>
                <CardDescription>
                    {t("pages.events.locatedCount", {
                        count: eventsWithCoords.length,
                    })}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="relative isolate">
                    <Map
                        center={centroidOf(firstNeighborhood.geometry)}
                        zoom={14}
                        className="h-[480px] w-full"
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
                        <MarkerCluster>
                            {eventsWithCoords.map((evt) => (
                                <Marker
                                    key={evt._id}
                                    variant="event"
                                    position={pointToLatLng(evt.location!)}
                                    popup={
                                        <div className="space-y-1">
                                            <p className="font-medium">
                                                {evt.title}
                                            </p>
                                            <p className="text-muted-foreground text-xs">
                                                {new Date(
                                                    evt.date,
                                                ).toLocaleString(i18n.language)}
                                            </p>
                                            <ParticipantCount
                                                count={
                                                    evt.interestedUserIds
                                                        ?.length ?? 0
                                                }
                                            />
                                        </div>
                                    }
                                />
                            ))}
                        </MarkerCluster>
                        <MapControls
                            home={
                                myLocation?.lat != null &&
                                myLocation?.lng != null
                                    ? [myLocation.lat, myLocation.lng]
                                    : null
                            }
                            fitGeometry={
                                myLocation?.neighborhood?.geometry ?? null
                            }
                        />
                    </Map>
                </div>
            </CardContent>
        </Card>
    );
}
