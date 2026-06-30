"use client";

import {
    forwardRef,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
    type Ref,
    type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
    Marker as LeafletMarker,
    MapContainer,
    Polygon,
    Popup,
    TileLayer,
    useMap,
    useMapEvents,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-markercluster";
import {
    Home01Icon,
    Location01Icon,
    Maximize01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet-draw/dist/leaflet.draw.css";
import { Button } from "@workspace/ui/components/button";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";

const OSM_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export type LatLng = [number, number];

interface MapProps {
    center: LatLng;
    zoom?: number;
    className?: string;
    children?: ReactNode;
    scrollWheelZoom?: boolean;
}

export const Map = forwardRef<L.Map, MapProps>(function Map(
    { center, zoom = 13, className, children, scrollWheelZoom = false },
    ref,
) {
    return (
        <MapContainer
            center={center}
            zoom={zoom}
            className={cn(
                "leaflet-container bg-card rounded-md border",
                className,
            )}
            ref={ref as Ref<L.Map>}
            scrollWheelZoom={scrollWheelZoom}
        >
            <TileLayer url={OSM_URL} attribution={OSM_ATTRIBUTION} />
            {children}
        </MapContainer>
    );
});

type MarkerVariant = "default" | "service" | "incident" | "event";

const VARIANT_COLORS: Record<MarkerVariant, string> = {
    default: "#18181B",
    service: "#16a34a",
    incident: "#dc2626",
    event: "#16a34a",
};

function buildDivIcon(variant: MarkerVariant): L.DivIcon {
    const color = VARIANT_COLORS[variant];
    const svg = `
        <svg viewBox="0 0 24 24" width="28" height="36" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2 C 7 2 3 6 3 11 C 3 17 12 22 12 22 C 12 22 21 17 21 11 C 21 6 17 2 12 2 Z"
                  fill="${color}" stroke="white" stroke-width="2"/>
            <circle cx="12" cy="11" r="3" fill="white"/>
        </svg>
    `;
    return L.divIcon({
        html: svg,
        className: `qc-marker qc-marker--${variant}`,
        iconSize: [28, 36],
        iconAnchor: [14, 36],
        popupAnchor: [0, -36],
    });
}

interface MarkerProps {
    position: LatLng;
    variant?: MarkerVariant;
    popup?: ReactNode;
    onClick?: () => void;
}

export function Marker({
    position,
    variant = "default",
    popup,
    onClick,
}: MarkerProps) {
    const icon = useMemo(() => buildDivIcon(variant), [variant]);
    return (
        <LeafletMarker
            position={position}
            icon={icon}
            eventHandlers={onClick ? { click: onClick } : undefined}
        >
            {popup ? <Popup>{popup}</Popup> : null}
        </LeafletMarker>
    );
}

interface NeighborhoodPolygonProps {
    geometry: GeoJSON.Polygon;
    color?: string;
    label?: string;
}

export function NeighborhoodPolygon({
    geometry,
    color = "#16a34a",
    label,
}: NeighborhoodPolygonProps) {
    const positions: LatLng[] = geometry.coordinates[0].map(
        ([lng, lat]) => [lat, lng] as LatLng,
    );
    return (
        <Polygon
            positions={positions}
            pathOptions={{
                color,
                weight: 3,
                fillColor: color,
                fillOpacity: 0.2,
                opacity: 0.9,
            }}
        >
            {label ? <Popup>{label}</Popup> : null}
        </Polygon>
    );
}

interface UserLocationProps {
    onLocate?: (coords: { lat: number; lng: number }) => void;
    fallbackCenter?: LatLng;
}

export function UserLocation({ onLocate, fallbackCenter }: UserLocationProps) {
    const map = useMap();
    useEffect(() => {
        if (!navigator.geolocation) {
            if (fallbackCenter) map.setView(fallbackCenter, map.getZoom());
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                map.setView([lat, lng], 14);
                onLocate?.({ lat, lng });
            },
            () => {
                if (fallbackCenter) map.setView(fallbackCenter, map.getZoom());
            },
            { enableHighAccuracy: true, timeout: 5000 },
        );
    }, [map, onLocate, fallbackCenter]);
    return null;
}

interface MapClickHandlerProps {
    onClick: (lat: number, lng: number) => void;
}

export function MapClickHandler({ onClick }: MapClickHandlerProps) {
    useMapEvents({
        click(e) {
            onClick(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

interface MarkerClusterProps {
    children: ReactNode;
    maxClusterRadius?: number;
}

export function MarkerCluster({
    children,
    maxClusterRadius = 50,
}: MarkerClusterProps) {
    return (
        <MarkerClusterGroup chunkedLoading maxClusterRadius={maxClusterRadius}>
            {children}
        </MarkerClusterGroup>
    );
}

interface DrawControlProps {
    mode: "polygon";
    onCreate?: (geometry: GeoJSON.Polygon) => void;
    onEdit?: (geometry: GeoJSON.Polygon) => void;
    onDelete?: () => void;
}

export function DrawControl({
    mode,
    onCreate,
    onEdit,
    onDelete,
}: DrawControlProps) {
    const map = useMap();
    const callbacksRef = useRef({ onCreate, onEdit, onDelete });
    useEffect(() => {
        callbacksRef.current = { onCreate, onEdit, onDelete };
    });

    useEffect(() => {
        let drawControl: L.Control | null = null;
        let cancelled = false;
        const featureGroup = L.featureGroup().addTo(map);

        const handleCreated = (e: L.LeafletEvent) => {
            const layer = (e as unknown as { layer: L.Layer }).layer;
            featureGroup.addLayer(layer);
            const geojson = (
                layer as L.Polygon
            ).toGeoJSON() as GeoJSON.Feature<GeoJSON.Polygon>;
            if (geojson.geometry.type === "Polygon") {
                callbacksRef.current.onCreate?.(geojson.geometry);
            }
        };
        const handleEdited = (e: L.LeafletEvent) => {
            const layers = (e as unknown as { layers: L.LayerGroup }).layers;
            layers.eachLayer((layer) => {
                const geojson = (
                    layer as L.Polygon
                ).toGeoJSON() as GeoJSON.Feature<GeoJSON.Polygon>;
                if (geojson.geometry.type === "Polygon") {
                    callbacksRef.current.onEdit?.(geojson.geometry);
                }
            });
        };
        const handleDeleted = () => callbacksRef.current.onDelete?.();

        void import("leaflet-draw").then(() => {
            if (cancelled) return;
            const LDraw = (
                L.Control as unknown as {
                    Draw: new (opts: unknown) => L.Control;
                }
            ).Draw;
            drawControl = new LDraw({
                position: "topright",
                draw: {
                    polygon: mode === "polygon" ? {} : false,
                    polyline: false,
                    rectangle: false,
                    circle: false,
                    marker: false,
                    circlemarker: false,
                },
                edit: { featureGroup },
            });
            map.addControl(drawControl);
            map.on("draw:created" as never, handleCreated as never);
            map.on("draw:edited" as never, handleEdited as never);
            map.on("draw:deleted" as never, handleDeleted as never);
        });

        return () => {
            cancelled = true;
            map.off("draw:created" as never, handleCreated as never);
            map.off("draw:edited" as never, handleEdited as never);
            map.off("draw:deleted" as never, handleDeleted as never);
            if (drawControl) map.removeControl(drawControl);
            map.removeLayer(featureGroup);
        };
    }, [map, mode]);
    return null;
}

export function useFitBounds(positions: LatLng[]): RefObject<L.Map | null> {
    const ref = useRef<L.Map | null>(null);
    useEffect(() => {
        if (!ref.current || positions.length === 0) return;
        const bounds = L.latLngBounds(positions);
        ref.current.fitBounds(bounds, { padding: [40, 40] });
    }, [positions]);
    return ref;
}

interface MapControlsProps {
    /** The user's home (address) point. Omit to hide the "home" button. */
    home?: LatLng | null;
    /** The user's neighborhood polygon. Omit to hide the "see neighborhood" button. */
    fitGeometry?: GeoJSON.Polygon | null;
}

/**
 * Overlay control buttons for any `<Map>`. Render it INSIDE a `<Map>` (it reads
 * the Leaflet instance from context). Buttons (icon + tooltip): recenter on the
 * live geolocation, on the home point, and fit to the neighborhood. The button
 * row is portaled into the Leaflet container with event propagation disabled so
 * clicks don't pan the map.
 */
export function MapControls({ home, fitGeometry }: MapControlsProps) {
    const map = useMap();
    const { t } = useTranslation();
    const [live, setLive] = useState<LatLng | null>(null);
    const [pending, setPending] = useState(false);

    const fitPositions = useMemo<LatLng[]>(
        () =>
            fitGeometry
                ? fitGeometry.coordinates[0].map(
                      ([lng, lat]) => [lat, lng] as LatLng,
                  )
                : [],
        [fitGeometry],
    );

    const locateMe = useCallback(() => {
        if (!navigator.geolocation) return;
        setPending(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const point: LatLng = [
                    pos.coords.latitude,
                    pos.coords.longitude,
                ];
                setLive(point);
                setPending(false);
                map.flyTo(point, 16);
            },
            () => setPending(false),
            { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
        );
    }, [map]);

    const overlayRef = useCallback((node: HTMLDivElement | null) => {
        if (!node) return;
        L.DomEvent.disableClickPropagation(node);
        L.DomEvent.disableScrollPropagation(node);
    }, []);

    const overlay = (
        <TooltipProvider>
            <div
                ref={overlayRef}
                className="absolute top-2 right-2 z-[1000] flex flex-col gap-1"
            >
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            onClick={locateMe}
                            disabled={pending}
                            aria-label={t("map.myPosition")}
                            className="bg-background/90 shadow-sm backdrop-blur-sm"
                        >
                            <HugeiconsIcon icon={Location01Icon} />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                        {t("map.myPosition")}
                    </TooltipContent>
                </Tooltip>

                {home ? (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon-sm"
                                onClick={() => map.flyTo(home, 16)}
                                aria-label={t("map.home")}
                                className="bg-background/90 shadow-sm backdrop-blur-sm"
                            >
                                <HugeiconsIcon icon={Home01Icon} />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left">
                            {t("map.home")}
                        </TooltipContent>
                    </Tooltip>
                ) : null}

                {fitPositions.length > 0 ? (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon-sm"
                                onClick={() =>
                                    map.fitBounds(fitPositions, {
                                        padding: [40, 40],
                                    })
                                }
                                aria-label={t("map.myNeighborhood")}
                                className="bg-background/90 shadow-sm backdrop-blur-sm"
                            >
                                <HugeiconsIcon icon={Maximize01Icon} />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left">
                            {t("map.myNeighborhood")}
                        </TooltipContent>
                    </Tooltip>
                ) : null}
            </div>
        </TooltipProvider>
    );

    return (
        <>
            {createPortal(overlay, map.getContainer())}
            {live ? (
                <Marker
                    position={live}
                    variant="service"
                    popup={t("map.youAreHere")}
                />
            ) : null}
        </>
    );
}
