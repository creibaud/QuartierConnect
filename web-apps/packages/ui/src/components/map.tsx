"use client";

import {
    type ReactNode,
    type Ref,
    type RefObject,
    forwardRef,
    useEffect,
    useMemo,
    useRef,
} from "react";
import {
    MapContainer,
    TileLayer,
    Marker as LeafletMarker,
    Polygon,
    Popup,
    useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
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
                "leaflet-container rounded-md border bg-card",
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
    color = "#18181B",
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
                weight: 2,
                fillOpacity: 0.08,
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

export function useFitBounds(positions: LatLng[]): RefObject<L.Map | null> {
    const ref = useRef<L.Map | null>(null);
    useEffect(() => {
        if (!ref.current || positions.length === 0) return;
        const bounds = L.latLngBounds(positions);
        ref.current.fitBounds(bounds, { padding: [40, 40] });
    }, [positions]);
    return ref;
}
