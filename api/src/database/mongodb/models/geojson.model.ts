export type GeoJsonPoint = {
    type: "Point";
    coordinates: [number, number];
};

export type GeoJsonPolygon = {
    type: "Polygon";
    coordinates: number[][][];
};

export type GeoJsonMultiPolygon = {
    type: "MultiPolygon";
    coordinates: number[][][][];
};

export type GeoJsonGeometry =
    | GeoJsonPoint
    | GeoJsonPolygon
    | GeoJsonMultiPolygon;
