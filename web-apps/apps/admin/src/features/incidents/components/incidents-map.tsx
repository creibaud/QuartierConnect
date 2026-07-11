import { useTranslation } from "react-i18next";
import { centroidOf } from "@workspace/shared/lib/geo";
import type { Incident, Neighborhood } from "@workspace/shared/lib/types";
import { Map, Marker, NeighborhoodPolygon } from "@workspace/ui/components/map";
import { statusLabel } from "../lib/incident-status";

export function IncidentsMap({
    incidents,
    neighborhoods,
}: {
    incidents: Incident[];
    neighborhoods: Neighborhood[];
}) {
    const { t } = useTranslation();
    const firstNeighborhood = neighborhoods.find((n) => n.geometry);
    const incidentsWithCoords = incidents.filter(
        (i) => i.lat !== null && i.lng !== null,
    );
    const center: [number, number] = firstNeighborhood?.geometry
        ? centroidOf(firstNeighborhood.geometry)
        : [48.8566, 2.3522];
    return (
        <Map
            center={center}
            zoom={13}
            className="h-[600px] min-h-[60vh] w-full overflow-hidden rounded-lg border"
        >
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
                                {t("adminPages.incidents.statusColumn")} :{" "}
                                {statusLabel(t, inc.status)}
                            </p>
                        </div>
                    }
                />
            ))}
        </Map>
    );
}
