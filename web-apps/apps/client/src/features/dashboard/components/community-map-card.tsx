import { useTranslation } from "react-i18next";
import { centroidOf } from "@workspace/shared/lib/geo";
import { useEvents } from "@workspace/shared/lib/hooks/events.hooks";
import { useInfiniteIncidents } from "@workspace/shared/lib/hooks/incidents.hooks";
import { useInfiniteServices } from "@workspace/shared/lib/hooks/services.hooks";
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
    MapLegend,
    Marker,
    NeighborhoodPolygon,
} from "@workspace/ui/components/map";
import { useMyLocation } from "@/features/onboarding/hooks/address.hooks";
import { entitiesToMarkers } from "../lib/community-markers";

export function CommunityMapCard() {
    const { t } = useTranslation();
    const { data: myLocation } = useMyLocation();
    const { data: servicePages } = useInfiniteServices();
    const { data: events } = useEvents(100);
    const { data: incidentPages } = useInfiniteIncidents(100);

    const neighborhood = myLocation?.neighborhood ?? null;
    if (!neighborhood?.geometry) return null;

    const home =
        myLocation?.lat != null && myLocation?.lng != null
            ? { lat: myLocation.lat, lng: myLocation.lng }
            : null;

    const markers = entitiesToMarkers({
        services: servicePages?.pages.flat() ?? [],
        events: events ?? [],
        incidents: incidentPages?.pages.flat() ?? [],
        home,
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">
                    {t("pages.dashboard.communityMap.title")}
                </CardTitle>
                <CardDescription>
                    {t("pages.dashboard.communityMap.description")}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="relative isolate">
                    <Map
                        center={centroidOf(neighborhood.geometry)}
                        zoom={14}
                        className="h-[420px] w-full"
                    >
                        <NeighborhoodPolygon
                            geometry={neighborhood.geometry}
                            label={neighborhood.name}
                        />
                        {markers.map((m) => (
                            <Marker
                                key={m.key}
                                variant={m.variant}
                                position={m.position}
                                popup={
                                    m.variant === "home" ? undefined : m.title
                                }
                            />
                        ))}
                        <MapControls
                            home={home ? [home.lat, home.lng] : null}
                            fitGeometry={neighborhood.geometry}
                        />
                        <MapLegend
                            entries={[
                                {
                                    variant: "serviceOffer",
                                    label: t(
                                        "pages.dashboard.communityMap.legend.serviceOffer",
                                    ),
                                },
                                {
                                    variant: "serviceRequest",
                                    label: t(
                                        "pages.dashboard.communityMap.legend.serviceRequest",
                                    ),
                                },
                                {
                                    variant: "event",
                                    label: t(
                                        "pages.dashboard.communityMap.legend.event",
                                    ),
                                },
                                {
                                    variant: "incident",
                                    label: t(
                                        "pages.dashboard.communityMap.legend.incident",
                                    ),
                                },
                                {
                                    variant: "home",
                                    label: t(
                                        "pages.dashboard.communityMap.legend.home",
                                    ),
                                },
                            ]}
                        />
                    </Map>
                </div>
            </CardContent>
        </Card>
    );
}
