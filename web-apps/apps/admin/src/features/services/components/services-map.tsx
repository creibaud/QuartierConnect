import { useTranslation } from "react-i18next";
import { centroidOf, pointToLatLng } from "@workspace/shared/lib/geo";
import type { Neighborhood, Service } from "@workspace/shared/lib/types";
import {
    Map,
    Marker,
    MarkerCluster,
    NeighborhoodPolygon,
} from "@workspace/ui/components/map";

export function ServicesMap({
    services,
    neighborhoods,
}: {
    services: Service[];
    neighborhoods: Neighborhood[];
}) {
    const { t } = useTranslation();
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
                                <p className="text-xs">
                                    {t(
                                        `pages.services.categories.${s.category}`,
                                        { defaultValue: s.category },
                                    )}
                                </p>
                            </div>
                        }
                    />
                ))}
            </MarkerCluster>
        </Map>
    );
}
