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
