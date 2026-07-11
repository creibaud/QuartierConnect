import { useTranslation } from "react-i18next";
import type { Neighborhood } from "@workspace/shared/lib/types";
import {
    DrawControl,
    Map,
    NeighborhoodPolygon,
} from "@workspace/ui/components/map";

export function NeighborhoodPolygonEditor({
    initialGeometry,
    others,
    onChange,
}: {
    initialGeometry?: GeoJSON.Polygon;
    others: Neighborhood[];
    onChange: (geometry: GeoJSON.Polygon | null) => void;
}) {
    const { t } = useTranslation();
    return (
        <div className="space-y-2">
            <p className="text-sm leading-none font-medium">
                {t("adminPages.neighborhoods.polygonOnMap")}
            </p>
            <p className="text-muted-foreground text-xs">
                {t("adminPages.neighborhoods.polygonHint")}
            </p>
            <Map center={[48.8566, 2.3522]} zoom={13} className="h-80 w-full">
                {others.map((n) =>
                    n.geometry ? (
                        <NeighborhoodPolygon
                            key={n._id}
                            geometry={n.geometry as GeoJSON.Polygon}
                            label={n.name}
                        />
                    ) : null,
                )}
                <DrawControl
                    mode="polygon"
                    initialGeometry={initialGeometry}
                    onCreate={onChange}
                    onEdit={onChange}
                    onDelete={() => onChange(null)}
                />
            </Map>
        </div>
    );
}
