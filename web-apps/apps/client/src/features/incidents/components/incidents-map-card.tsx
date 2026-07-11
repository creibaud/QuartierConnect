import { useTranslation } from "react-i18next";
import { centroidOf } from "@workspace/shared/lib/geo";
import { useNeighborhoods } from "@workspace/shared/lib/hooks/neighborhoods.hooks";
import type { Incident } from "@workspace/shared/lib/types";
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
    NeighborhoodPolygon,
} from "@workspace/ui/components/map";
import { useMyLocation } from "@/features/onboarding/hooks/address.hooks";
import { incidentStatusLabels } from "../lib/status-labels";

export function IncidentsMapCard({ incidents }: { incidents: Incident[] }) {
    const { t } = useTranslation();
    const { data: neighborhoods } = useNeighborhoods();
    const { data: myLocation } = useMyLocation();
    const firstNeighborhood = neighborhoods?.find((n) => n.geometry);
    const incidentsWithCoords = incidents.filter(
        (i) => i.lat !== null && i.lng !== null,
    );
    const statusLabels = incidentStatusLabels(t);

    if (!firstNeighborhood?.geometry) return null;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">
                    {t("pages.incidents.mapTitle")}
                </CardTitle>
                <CardDescription>
                    {t("pages.incidents.locatedCount", {
                        count: incidentsWithCoords.length,
                    })}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="relative isolate">
                    <Map
                        center={centroidOf(firstNeighborhood.geometry)}
                        zoom={14}
                        className="h-[40dvh] min-h-64 w-full md:h-[400px] md:min-h-[400px]"
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
                                            {t("pages.incidents.statusLabel", {
                                                status:
                                                    statusLabels[inc.status] ??
                                                    inc.status,
                                            })}
                                        </p>
                                    </div>
                                }
                            />
                        ))}
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
