"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
    Cursor01Icon,
    Delete02Icon,
    PenTool03Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    TerraDraw,
    TerraDrawPolygonMode,
    TerraDrawSelectMode,
    type TerraDrawEventListeners,
} from "terra-draw";
import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter";
import { Button } from "@workspace/ui/components/button";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { useMap } from "@workspace/ui/components/ui/map";

/** Neighborhood terracotta (light primary, oklch(0.5 0.14 42) as hex). */
const SHAPE_COLOR = "#a24112";
const VERTEX_COLOR = "#ffffff";
const COORDINATE_PRECISION = 9;

type DrawTool = "draw" | "edit";

export interface DrawControlProps {
    mode: "polygon";
    /** Existing polygon to display and edit (e.g. when editing a neighborhood). */
    initialGeometry?: GeoJSON.Polygon;
    onCreate?: (geometry: GeoJSON.Polygon) => void;
    onEdit?: (geometry: GeoJSON.Polygon) => void;
    onDelete?: () => void;
}

function roundPolygon(geometry: GeoJSON.Polygon): GeoJSON.Polygon {
    const factor = 10 ** COORDINATE_PRECISION;
    const round = (value: number) => Math.round(value * factor) / factor;
    return {
        type: "Polygon",
        coordinates: geometry.coordinates.map((ring) =>
            ring.map(([lng, lat]) => [round(lng), round(lat)]),
        ),
    };
}

function createDrawModes() {
    return [
        new TerraDrawPolygonMode({
            // Leave Escape for the dialog; toolbar covers cancel/delete.
            keyEvents: { cancel: null, finish: "Enter" },
            styles: {
                fillColor: SHAPE_COLOR,
                fillOpacity: 0.2,
                outlineColor: SHAPE_COLOR,
                outlineWidth: 3,
                closingPointColor: VERTEX_COLOR,
                closingPointWidth: 5,
                closingPointOutlineColor: SHAPE_COLOR,
                closingPointOutlineWidth: 2,
            },
        }),
        new TerraDrawSelectMode({
            keyEvents: {
                deselect: null,
                delete: "Delete",
                rotate: null,
                scale: null,
            },
            flags: {
                polygon: {
                    feature: {
                        draggable: true,
                        coordinates: {
                            midpoints: true,
                            draggable: true,
                            deletable: true,
                        },
                    },
                },
            },
            styles: {
                selectedPolygonColor: SHAPE_COLOR,
                selectedPolygonFillOpacity: 0.25,
                selectedPolygonOutlineColor: SHAPE_COLOR,
                selectedPolygonOutlineWidth: 3,
                selectionPointColor: VERTEX_COLOR,
                selectionPointWidth: 5,
                selectionPointOutlineColor: SHAPE_COLOR,
                selectionPointOutlineWidth: 2,
                midPointColor: SHAPE_COLOR,
                midPointWidth: 4,
                midPointOutlineColor: VERTEX_COLOR,
                midPointOutlineWidth: 1,
            },
        }),
    ];
}

function fitMapToPolygon(
    map: NonNullable<ReturnType<typeof useMap>["map"]>,
    geometry: GeoJSON.Polygon,
) {
    const ring = geometry.coordinates[0];
    const lngs = ring.map(([lng]) => lng);
    const lats = ring.map(([, lat]) => lat);
    map.fitBounds(
        [
            [Math.min(...lngs), Math.min(...lats)],
            [Math.max(...lngs), Math.max(...lats)],
        ],
        { padding: 40, duration: 0 },
    );
}

function polygonFeatureIds(draw: TerraDraw) {
    return draw
        .getSnapshot()
        .filter((feature) => feature.geometry.type === "Polygon")
        .map((feature) => feature.id)
        .filter((id) => id !== undefined);
}

/** Polygon draw/edit toolbar backed by terra-draw. Render inside a `<Map>`. */
export function DrawControl({
    mode,
    initialGeometry,
    onCreate,
    onEdit,
    onDelete,
}: DrawControlProps) {
    const { map, isLoaded } = useMap();
    const { t } = useTranslation();
    const drawRef = useRef<TerraDraw | null>(null);
    const geometryRef = useRef<GeoJSON.Polygon | null>(
        initialGeometry ?? null,
    );
    const [activeTool, setActiveTool] = useState<DrawTool>(
        initialGeometry ? "edit" : "draw",
    );
    const [hasPolygon, setHasPolygon] = useState(Boolean(initialGeometry));
    const [isReady, setIsReady] = useState(false);
    const hasFitToSeedRef = useRef(false);
    const callbacksRef = useRef({ onCreate, onEdit, onDelete });
    useEffect(() => {
        callbacksRef.current = { onCreate, onEdit, onDelete };
    });

    useEffect(() => {
        if (!map || !isLoaded || mode !== "polygon") return;

        const draw = new TerraDraw({
            adapter: new TerraDrawMapLibreGLAdapter({
                map,
                coordinatePrecision: COORDINATE_PRECISION,
            }),
            modes: createDrawModes(),
        });

        const beginSession = () => {
            drawRef.current = draw;
            const seed = geometryRef.current;
            if (seed) {
                const seedId = crypto.randomUUID();
                draw.addFeatures([
                    {
                        id: seedId,
                        type: "Feature",
                        geometry: roundPolygon(seed),
                        properties: { mode: "polygon" },
                    },
                ]);
                draw.setMode("select");
                if (draw.hasFeature(seedId)) draw.selectFeature(seedId);
                if (!hasFitToSeedRef.current) {
                    hasFitToSeedRef.current = true;
                    fitMapToPolygon(map, seed);
                }
            } else {
                draw.setMode("polygon");
            }
            setActiveTool(seed ? "edit" : "draw");
            setHasPolygon(Boolean(seed));
            setIsReady(true);
        };

        let pendingFrame = 0;

        const handleFinish: TerraDrawEventListeners["finish"] = (
            id,
            context,
        ) => {
            const feature = draw.getSnapshotFeature(id);
            if (!feature || feature.geometry.type !== "Polygon") return;
            const geometry = feature.geometry as GeoJSON.Polygon;
            geometryRef.current = geometry;
            if (context.action === "draw") {
                setHasPolygon(true);
                callbacksRef.current.onCreate?.(geometry);
                pendingFrame = requestAnimationFrame(() => {
                    if (drawRef.current !== draw) return;
                    draw.setMode("select");
                    draw.selectFeature(id);
                    setActiveTool("edit");
                });
            } else {
                callbacksRef.current.onEdit?.(geometry);
            }
        };

        const handleChange: TerraDrawEventListeners["change"] = (
            _ids,
            type,
        ) => {
            if (type !== "delete") return;
            if (geometryRef.current === null) return;
            if (polygonFeatureIds(draw).length > 0) return;
            geometryRef.current = null;
            setHasPolygon(false);
            callbacksRef.current.onDelete?.();
        };

        draw.on("ready", beginSession);
        draw.on("finish", handleFinish);
        draw.on("change", handleChange);
        draw.start();

        return () => {
            cancelAnimationFrame(pendingFrame);
            draw.off("ready", beginSession);
            draw.off("finish", handleFinish);
            draw.off("change", handleChange);
            drawRef.current = null;
            setIsReady(false);
            try {
                if (draw.enabled) draw.stop();
            } catch {
                // Layers may already be gone (theme switch or map teardown).
            }
        };
    }, [map, isLoaded, mode]);

    const clearPolygon = useCallback(() => {
        const draw = drawRef.current;
        if (!draw) return;
        const ids = polygonFeatureIds(draw);
        if (ids.length > 0) draw.removeFeatures(ids);
        if (geometryRef.current !== null) {
            geometryRef.current = null;
            setHasPolygon(false);
            callbacksRef.current.onDelete?.();
        }
    }, []);

    const startDrawing = useCallback(() => {
        const draw = drawRef.current;
        if (!draw) return;
        clearPolygon();
        draw.setMode("polygon");
        setActiveTool("draw");
    }, [clearPolygon]);

    const startEditing = useCallback(() => {
        const draw = drawRef.current;
        if (!draw) return;
        draw.setMode("select");
        const [id] = polygonFeatureIds(draw);
        if (id !== undefined) draw.selectFeature(id);
        setActiveTool("edit");
    }, []);

    const deletePolygon = useCallback(() => {
        const draw = drawRef.current;
        if (!draw) return;
        clearPolygon();
        draw.setMode("polygon");
        setActiveTool("draw");
    }, [clearPolygon]);

    const container = map?.getContainer();
    if (!container || mode !== "polygon") return null;

    const toolbar = (
        <TooltipProvider>
            <div className="absolute top-2 right-2 z-[1000] flex flex-col gap-1">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            type="button"
                            variant={
                                activeTool === "draw" ? "default" : "outline"
                            }
                            size="icon"
                            onClick={startDrawing}
                            disabled={!isReady}
                            aria-label={t("map.draw.drawPolygon")}
                            data-testid="map-draw-polygon"
                            className={
                                activeTool === "draw"
                                    ? "shadow-sm"
                                    : "bg-background/90 shadow-sm backdrop-blur-sm"
                            }
                        >
                            <HugeiconsIcon icon={PenTool03Icon} />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                        {t("map.draw.drawPolygon")}
                    </TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            type="button"
                            variant={
                                activeTool === "edit" ? "default" : "outline"
                            }
                            size="icon"
                            onClick={startEditing}
                            disabled={!isReady || !hasPolygon}
                            aria-label={t("map.draw.editPolygon")}
                            data-testid="map-edit-polygon"
                            className={
                                activeTool === "edit"
                                    ? "shadow-sm"
                                    : "bg-background/90 shadow-sm backdrop-blur-sm"
                            }
                        >
                            <HugeiconsIcon icon={Cursor01Icon} />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                        {t("map.draw.editPolygon")}
                    </TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={deletePolygon}
                            disabled={!isReady || !hasPolygon}
                            aria-label={t("map.draw.deletePolygon")}
                            data-testid="map-delete-polygon"
                            className="bg-background/90 text-destructive hover:text-destructive shadow-sm backdrop-blur-sm"
                        >
                            <HugeiconsIcon icon={Delete02Icon} />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                        {t("map.draw.deletePolygon")}
                    </TooltipContent>
                </Tooltip>
            </div>
        </TooltipProvider>
    );

    return createPortal(toolbar, container);
}
