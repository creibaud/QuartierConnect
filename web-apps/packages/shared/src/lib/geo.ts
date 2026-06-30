import type { GeoJsonPoint, GeoJsonPolygon } from "./types";

export function centroidOf(geom: GeoJsonPolygon): [number, number] {
    const ring = geom.coordinates[0];
    let sumLat = 0;
    let sumLng = 0;
    for (const [lng, lat] of ring) {
        sumLat += lat;
        sumLng += lng;
    }
    return [sumLat / ring.length, sumLng / ring.length];
}

export function pointToLatLng(point: GeoJsonPoint): [number, number] {
    return [point.coordinates[1], point.coordinates[0]];
}

export function latLngToPoint(lat: number, lng: number): GeoJsonPoint {
    return { type: "Point", coordinates: [lng, lat] };
}

/**
 * Ray-casting point-in-polygon on the outer ring of a GeoJSON Polygon.
 * Coordinates are [lng, lat]; the point is (lat, lng).
 */
export function pointInPolygon(
    lat: number,
    lng: number,
    geom: GeoJsonPolygon,
): boolean {
    const ring = geom.coordinates[0];
    if (!ring || ring.length < 3) return false;
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i];
        const [xj, yj] = ring[j];
        const intersects =
            yi > lat !== yj > lat &&
            lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
        if (intersects) inside = !inside;
    }
    return inside;
}
