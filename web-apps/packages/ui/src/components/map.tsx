"use client";

import {
    forwardRef,
    useCallback,
    useEffect,
    useRef,
    useState,
    type ReactNode,
    type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
    Home01Icon,
    Location01Icon,
    Maximize01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@workspace/ui/components/button";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import {
    MapControls as MapcnControls,
    MapGeoJSON,
    Map as MapLibreMap,
    MapMarker,
    MarkerContent,
    MarkerPopup,
    useMap,
    type MapRef,
} from "@workspace/ui/components/ui/map";
import { cn } from "@workspace/ui/lib/utils";
import type { MapMouseEvent } from "maplibre-gl";

// ─── Public types ──────────────────────────────────────────────────────────

/** [latitude, longitude] – Leaflet convention; consumers must not change. */
export type LatLng = [number, number];

// ─── useIsDark ─────────────────────────────────────────────────────────────

export function useIsDark(): boolean {
    const [isDark, setIsDark] = useState(
        () =>
            typeof document !== "undefined" &&
            document.documentElement.classList.contains("dark"),
    );
    useEffect(() => {
        const el = document.documentElement;
        const update = () => setIsDark(el.classList.contains("dark"));
        update();
        const observer = new MutationObserver(update);
        observer.observe(el, { attributes: true, attributeFilter: ["class"] });
        return () => observer.disconnect();
    }, []);
    return isDark;
}

// ─── Map ───────────────────────────────────────────────────────────────────

interface MapProps {
    center: LatLng;
    zoom?: number;
    className?: string;
    children?: ReactNode;
    scrollWheelZoom?: boolean;
}

/**
 * Thin wrapper over the mapcn MapLibre Map.
 *
 * Public API keeps `center: [lat, lng]` (Leaflet order).
 * The swap to MapLibre's `[lng, lat]` happens here so consumers are unchanged.
 */
export const Map = forwardRef<MapRef, MapProps>(function Map(
    { center, zoom = 13, className, children, scrollWheelZoom = true },
    ref,
) {
    return (
        <MapLibreMap
            center={[center[1], center[0]]}
            zoom={zoom}
            className={cn("rounded-md border", className)}
            scrollZoom={scrollWheelZoom}
            projection={{ type: "globe" }}
            ref={ref}
        >
            {children}
            <MapcnControls showZoom showCompass position="top-left" />
        </MapLibreMap>
    );
});

// ─── Marker ────────────────────────────────────────────────────────────────

type MarkerVariant =
    | "serviceOffer"
    | "serviceRequest"
    | "event"
    | "incident"
    | "home"
    | "service"
    | "default";

export const MARKER_COLORS: Record<MarkerVariant, string> = {
    serviceOffer: "#16a34a",
    serviceRequest: "#f59e0b",
    event: "#2563eb",
    incident: "#dc2626",
    home: "#7c3aed",
    service: "#16a34a",
    default: "#64748b",
};

function MarkerDot({ color }: { color: string }) {
    return (
        <div
            className="size-3.5 rounded-full border-2 border-white shadow-md"
            style={{ backgroundColor: color }}
        />
    );
}

interface MarkerProps {
    position: LatLng;
    variant?: MarkerVariant;
    popup?: ReactNode;
    onClick?: () => void;
}

/** Dot marker. `position` is [lat, lng]; swapped to [lng, lat] for MapLibre. */
export function Marker({
    position,
    variant = "default",
    popup,
    onClick,
}: MarkerProps) {
    const color = MARKER_COLORS[variant];
    return (
        <MapMarker
            longitude={position[1]}
            latitude={position[0]}
            onClick={onClick ? () => onClick() : undefined}
        >
            <MarkerContent>
                <MarkerDot color={color} />
            </MarkerContent>
            {popup && <MarkerPopup>{popup}</MarkerPopup>}
        </MapMarker>
    );
}

// ─── MapLegend ───────────────────────────────────────────────────────────────

export interface MapLegendEntry {
    variant: MarkerVariant;
    label: string;
}

/** Overlay key explaining marker colors. Renders null when empty. */
export function MapLegend({ entries }: { entries: MapLegendEntry[] }) {
    if (entries.length === 0) return null;
    return (
        <div className="bg-background/90 text-foreground absolute bottom-3 left-3 z-10 rounded-md border p-2 text-xs shadow-sm backdrop-blur">
            <ul className="space-y-1">
                {entries.map((entry) => (
                    <li
                        key={`${entry.variant}-${entry.label}`}
                        className="flex items-center gap-2"
                    >
                        <span
                            className="size-2.5 rounded-full border border-white"
                            style={{
                                backgroundColor: MARKER_COLORS[entry.variant],
                            }}
                        />
                        {entry.label}
                    </li>
                ))}
            </ul>
        </div>
    );
}

// ─── NeighborhoodPolygon ───────────────────────────────────────────────────

interface NeighborhoodPolygonProps {
    geometry: GeoJSON.Polygon;
    color?: string;
    /** Not rendered – mapcn has no easy polygon label. Kept for API compat. */
    label?: string;
}

/**
 * Renders a GeoJSON polygon fill + outline.
 * GeoJSON coordinates are already [lng, lat] and are passed through unchanged.
 */
export function NeighborhoodPolygon({
    geometry,
    color = "#16a34a",
}: NeighborhoodPolygonProps) {
    return (
        <MapGeoJSON
            data={geometry}
            fillPaint={{ "fill-color": color, "fill-opacity": 0.2 }}
            linePaint={{
                "line-color": color,
                "line-width": 3,
                "line-opacity": 0.9,
            }}
        />
    );
}

// ─── MarkerCluster ─────────────────────────────────────────────────────────

interface MarkerClusterProps {
    children: ReactNode;
    maxClusterRadius?: number;
}

/**
 * Passthrough wrapper. The maps in this app have few markers so client-side
 * clustering is not required. The prop signature is preserved so consumers
 * compile without changes.
 */
export function MarkerCluster({ children }: MarkerClusterProps) {
    return <>{children}</>;
}

// ─── MapClickHandler ───────────────────────────────────────────────────────

interface MapClickHandlerProps {
    onClick: (lat: number, lng: number) => void;
}

/** Registers a map click listener; passes (lat, lng) to the callback. */
export function MapClickHandler({ onClick }: MapClickHandlerProps) {
    const { map, isLoaded } = useMap();
    const onClickRef = useRef(onClick);
    useEffect(() => {
        onClickRef.current = onClick;
    });

    useEffect(() => {
        if (!map || !isLoaded) return;
        const handler = (e: MapMouseEvent) => {
            onClickRef.current(e.lngLat.lat, e.lngLat.lng);
        };
        map.on("click", handler);
        return () => {
            map.off("click", handler);
        };
    }, [map, isLoaded]);

    return null;
}

// ─── MapControls ───────────────────────────────────────────────────────────

interface MapControlsProps {
    /** Home point [lat, lng]. Renders a "go home" button when provided. */
    home?: LatLng | null;
    /** Neighborhood polygon for the "fit to neighborhood" button. */
    fitGeometry?: GeoJSON.Polygon | null;
    /**
     * On mount, request the browser geolocation (prompting permission) and
     * center on the live position; fall back to `home` if denied/unavailable.
     */
    autoLocate?: boolean;
}

/**
 * Three-button overlay (locate / home / neighborhood) portaled into the
 * MapLibre container so it floats at top-right over the map.
 */
export function MapControls({
    home,
    fitGeometry,
    autoLocate = false,
}: MapControlsProps) {
    const { map } = useMap();
    const { t } = useTranslation();
    const [pending, setPending] = useState(false);
    const [livePosition, setLivePosition] = useState<LatLng | null>(null);
    const [is3D, setIs3D] = useState(false);
    const autoLocatedRef = useRef(false);

    useEffect(() => {
        if (!autoLocate || !map || autoLocatedRef.current) return;
        autoLocatedRef.current = true;
        const flyHome = () => {
            if (home) map.flyTo({ center: [home[1], home[0]], zoom: 15 });
        };
        if (!navigator.geolocation) {
            flyHome();
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                setLivePosition([lat, lng]);
                map.flyTo({ center: [lng, lat], zoom: 15 });
            },
            flyHome,
            { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
        );
    }, [autoLocate, map, home]);

    const locateMe = useCallback(() => {
        if (!map || !navigator.geolocation) return;
        setPending(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                setLivePosition([lat, lng]);
                setPending(false);
                map.flyTo({ center: [lng, lat], zoom: 16 });
            },
            () => setPending(false),
            { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
        );
    }, [map]);

    const goHome = useCallback(() => {
        if (!map || !home) return;
        map.flyTo({ center: [home[1], home[0]], zoom: 16 });
    }, [map, home]);

    const fitNeighborhood = useCallback(() => {
        if (!map || !fitGeometry) return;
        const coords = fitGeometry.coordinates[0];
        const lngs = coords.map(([lng]) => lng);
        const lats = coords.map(([, lat]) => lat);
        map.fitBounds(
            [
                [Math.min(...lngs), Math.min(...lats)],
                [Math.max(...lngs), Math.max(...lats)],
            ],
            { padding: 40 },
        );
    }, [map, fitGeometry]);

    const toggle3D = useCallback(() => {
        if (!map) return;
        const pitched = map.getPitch() > 0;
        map.easeTo({ pitch: pitched ? 0 : 55, duration: 500 });
        setIs3D(!pitched);
    }, [map]);

    const container = map?.getContainer();

    const overlay = (
        <TooltipProvider>
            <div className="absolute top-2 right-2 z-[1000] flex flex-col gap-1">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
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

                {home && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={goHome}
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
                )}

                {fitGeometry && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={fitNeighborhood}
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
                )}

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            type="button"
                            variant={is3D ? "default" : "outline"}
                            size="icon"
                            onClick={toggle3D}
                            aria-label={t("map.toggle3D")}
                            className={cn(
                                "text-xs font-semibold shadow-sm backdrop-blur-sm",
                                !is3D && "bg-background/90",
                            )}
                        >
                            {is3D ? "2D" : "3D"}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                        {t("map.toggle3D")}
                    </TooltipContent>
                </Tooltip>
            </div>
        </TooltipProvider>
    );

    return (
        <>
            {container ? createPortal(overlay, container) : null}
            {livePosition && (
                <Marker
                    position={livePosition}
                    variant="service"
                    popup={t("map.youAreHere")}
                />
            )}
        </>
    );
}

// ─── useFitBounds ──────────────────────────────────────────────────────────

/**
 * Returns a ref to attach to `<Map ref={...}>`. On mount, fits the map to
 * the bounding box of the given [lat, lng] positions.
 * Coordinates are swapped to [lng, lat] before passing to MapLibre.
 */
export function useFitBounds(positions: LatLng[]): RefObject<MapRef | null> {
    const ref = useRef<MapRef | null>(null);

    useEffect(() => {
        if (!ref.current || positions.length === 0) return;
        const map = ref.current;

        const lngs = positions.map(([, lng]) => lng);
        const lats = positions.map(([lat]) => lat);
        const bounds: [[number, number], [number, number]] = [
            [Math.min(...lngs), Math.min(...lats)],
            [Math.max(...lngs), Math.max(...lats)],
        ];

        const doFit = () => map.fitBounds(bounds, { padding: 40 });

        if (map.loaded()) {
            doFit();
        } else {
            map.once("load", doFit);
        }
    }, [positions]);

    return ref;
}

// ─── DrawControl (stub – admin app consumer; ported library TBD) ───────────

interface DrawControlProps {
    mode: "polygon";
    onCreate?: (geometry: GeoJSON.Polygon) => void;
    onEdit?: (geometry: GeoJSON.Polygon) => void;
    onDelete?: () => void;
}

/**
 * Stub. The Leaflet-draw polygon toolbar has not yet been ported to MapLibre.
 * Admin neighborhood polygon editing is temporarily unavailable.
 */
export function DrawControl(_props: DrawControlProps) {
    return null;
}

// ─── UserLocation (stub – no consumer uses this; kept for import compat) ───

interface UserLocationProps {
    onLocate?: (coords: { lat: number; lng: number }) => void;
    fallbackCenter?: LatLng;
}

/** @deprecated No active consumer. Stub retained to avoid breaking imports. */
export function UserLocation({
    onLocate,
    fallbackCenter: _fallbackCenter,
}: UserLocationProps) {
    const { map } = useMap();

    useEffect(() => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                map?.flyTo({ center: [lng, lat], zoom: 14 });
                onLocate?.({ lat, lng });
            },
            () => {},
            { enableHighAccuracy: true, timeout: 5000 },
        );
    }, [map, onLocate]);

    return null;
}
