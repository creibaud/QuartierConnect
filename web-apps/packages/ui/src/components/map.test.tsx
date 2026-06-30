// map.test.tsx — tests for the mapcn (MapLibre) compatibility wrapper.
//
// MapLibre GL requires WebGL, which is not available in jsdom. Tests that
// render the full <Map> tree are therefore skipped here — cover them with
// Playwright / E2E tests. Only components that have no map-context dependency
// and pure hooks are tested below.

import { describe, it, expect, vi } from "vitest";
import { render, renderHook } from "@testing-library/react";

// ── Mock the underlying mapcn layer before importing the wrapper ──────────
// This prevents maplibre-gl from initialising a WebGL context in jsdom.
vi.mock("@workspace/ui/components/ui/map", async () => {
    const React = await import("react");

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
                getContainer: () => document.createElement("div"),
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

describe("<DrawControl>", () => {
    it("mounts and unmounts without throwing", () => {
        const { unmount } = render(
            <DrawControl mode="polygon" onCreate={() => {}} />,
        );
        expect(() => unmount()).not.toThrow();
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
