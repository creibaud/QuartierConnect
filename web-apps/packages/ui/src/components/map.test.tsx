// MapLibre needs WebGL (absent in jsdom); full <Map> render is covered by E2E.
// Scope is limited to map-context-free components and pure hooks.

import { describe, it, expect, vi } from "vitest";
import { render, renderHook, screen } from "@testing-library/react";

// ── Mock terra-draw — it drives a real MapLibre instance jsdom can't provide ──
vi.mock("terra-draw", () => {
    class MockTerraDraw {
        enabled = true;
        private readyListeners: (() => void)[] = [];
        start = vi.fn(() => {
            for (const listener of this.readyListeners) listener();
        });
        stop = vi.fn();
        on = vi.fn((event: string, listener: () => void) => {
            if (event === "ready") this.readyListeners.push(listener);
        });
        off = vi.fn();
        setMode = vi.fn();
        addFeatures = vi.fn(() => []);
        removeFeatures = vi.fn();
        hasFeature = vi.fn(() => true);
        selectFeature = vi.fn();
        getSnapshot = vi.fn(() => []);
        getSnapshotFeature = vi.fn(() => undefined);
    }
    return {
        TerraDraw: MockTerraDraw,
        TerraDrawPolygonMode: class {},
        TerraDrawSelectMode: class {},
    };
});
vi.mock("terra-draw-maplibre-gl-adapter", () => ({
    TerraDrawMapLibreGLAdapter: class {},
}));

// ── Mock the mapcn layer to keep maplibre-gl from touching WebGL in jsdom ──
vi.mock("@workspace/ui/components/ui/map", async () => {
    const React = await import("react");
    const mapContainer = document.createElement("div");
    document.body.appendChild(mapContainer);

    const MockMap = React.forwardRef<
        {
            loaded: () => boolean;
            once: () => void;
            on: () => void;
            off: () => void;
            flyTo: () => void;
            fitBounds: () => void;
            getContainer: () => HTMLElement;
        },
        { children?: React.ReactNode; className?: string }
    >(function MockMap({ children, className }, ref) {
        const divRef = React.useRef<HTMLDivElement>(null);
        React.useImperativeHandle(ref, () => ({
            loaded: () => true,
            once: vi.fn(),
            on: vi.fn(),
            off: vi.fn(),
            flyTo: vi.fn(),
            fitBounds: vi.fn(),
            getContainer: () => divRef.current ?? document.createElement("div"),
        }));
        return React.createElement(
            "div",
            { ref: divRef, className: `maplibregl-map ${className ?? ""}` },
            children,
        );
    });

    return {
        Map: MockMap,
        MapGeoJSON: () => null,
        MapMarker: ({
            children,
        }: {
            children?: React.ReactNode;
        }) => React.createElement(React.Fragment, null, children),
        MarkerContent: ({
            children,
        }: {
            children?: React.ReactNode;
        }) =>
            React.createElement(
                "div",
                { className: "marker-content" },
                children,
            ),
        MarkerPopup: ({
            children,
        }: {
            children?: React.ReactNode;
        }) => React.createElement("div", { className: "marker-popup" }, children),
        useMap: vi.fn(() => ({
            map: {
                flyTo: vi.fn(),
                fitBounds: vi.fn(),
                on: vi.fn(),
                off: vi.fn(),
                once: vi.fn(),
                loaded: () => true,
                getContainer: () => mapContainer,
            },
            isLoaded: true,
            resolvedTheme: "light" as const,
        })),
    };
});

import {
    DrawControl,
    Map,
    MapClickHandler,
    MapControls,
    Marker,
    MarkerCluster,
    NeighborhoodPolygon,
    UserLocation,
    useIsDark,
    useFitBounds,
    type LatLng,
} from "./map";

// ─── Export smoke test ────────────────────────────────────────────────────

describe("map module", () => {
    it("exports all public symbols", () => {
        expect(Map).toBeDefined();
        expect(Marker).toBeDefined();
        expect(MarkerCluster).toBeDefined();
        expect(NeighborhoodPolygon).toBeDefined();
        expect(DrawControl).toBeDefined();
        expect(UserLocation).toBeDefined();
        expect(MapClickHandler).toBeDefined();
        expect(MapControls).toBeDefined();
        expect(useFitBounds).toBeDefined();
        expect(useIsDark).toBeDefined();
    });
});

// ─── DrawControl ──────────────────────────────────────────────────────────

const SQUARE: GeoJSON.Polygon = {
    type: "Polygon",
    coordinates: [
        [
            [2.35, 48.85],
            [2.36, 48.85],
            [2.36, 48.86],
            [2.35, 48.86],
            [2.35, 48.85],
        ],
    ],
};

describe("<DrawControl>", () => {
    it("mounts and unmounts without throwing", () => {
        const { unmount } = render(
            <DrawControl mode="polygon" onCreate={() => {}} />,
        );
        expect(() => unmount()).not.toThrow();
    });

    it("renders the draw / edit / delete toolbar", () => {
        const { unmount } = render(<DrawControl mode="polygon" />);
        expect(screen.getByTestId("map-draw-polygon")).toBeInTheDocument();
        expect(screen.getByTestId("map-edit-polygon")).toBeInTheDocument();
        expect(screen.getByTestId("map-delete-polygon")).toBeInTheDocument();
        unmount();
    });

    it("disables edit and delete while no polygon exists", () => {
        const { unmount } = render(<DrawControl mode="polygon" />);
        expect(screen.getByTestId("map-draw-polygon")).toBeEnabled();
        expect(screen.getByTestId("map-edit-polygon")).toBeDisabled();
        expect(screen.getByTestId("map-delete-polygon")).toBeDisabled();
        unmount();
    });

    it("enables edit and delete when given an initial geometry", () => {
        const { unmount } = render(
            <DrawControl mode="polygon" initialGeometry={SQUARE} />,
        );
        expect(screen.getByTestId("map-edit-polygon")).toBeEnabled();
        expect(screen.getByTestId("map-delete-polygon")).toBeEnabled();
        unmount();
    });
});

// ─── MarkerCluster ────────────────────────────────────────────────────────

describe("<MarkerCluster>", () => {
    it("renders provided children without throwing", () => {
        expect(() =>
            render(
                <MarkerCluster>
                    <span>marker</span>
                </MarkerCluster>,
            ),
        ).not.toThrow();
    });
});

// ─── useFitBounds ─────────────────────────────────────────────────────────

describe("useFitBounds", () => {
    it("returns a ref initialised to null for empty positions", () => {
        const { result } = renderHook(() => useFitBounds([]));
        expect(result.current).toHaveProperty("current");
        expect(result.current.current).toBeNull();
    });

    it("does not throw when positions are provided but no map is attached", () => {
        const positions: LatLng[] = [
            [48.85, 2.35],
            [48.86, 2.36],
        ];
        expect(() =>
            renderHook(() => useFitBounds(positions)),
        ).not.toThrow();
    });
});

// ─── useIsDark ────────────────────────────────────────────────────────────

describe("useIsDark", () => {
    it("returns a boolean", () => {
        const { result } = renderHook(() => useIsDark());
        expect(typeof result.current).toBe("boolean");
    });
});
