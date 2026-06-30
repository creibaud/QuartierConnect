// NOTE: packages/ui vitest has no jest-dom setup — use plain truthiness, not
// matchers like toBeInTheDocument.
//
// MapLibre GL requires WebGL, which jsdom cannot provide. Mock the underlying
// mapcn layer before importing the wrapper to avoid the crash.
import { vi } from "vitest";

vi.mock("@workspace/ui/components/ui/map", async () => {
    const React = await import("react");
    return {
        Map: React.forwardRef(function MockMap(
            { children }: { children?: React.ReactNode },
            _ref: unknown,
        ) {
            return React.createElement("div", null, children);
        }),
        MapGeoJSON: () => null,
        MapMarker: ({ children }: { children?: React.ReactNode }) =>
            React.createElement(React.Fragment, null, children),
        MarkerContent: ({ children }: { children?: React.ReactNode }) =>
            React.createElement("div", null, children),
        MarkerPopup: ({ children }: { children?: React.ReactNode }) =>
            React.createElement("div", null, children),
        MapControls: () => null,
        useMap: vi.fn(() => ({
            map: null,
            isLoaded: false,
            resolvedTheme: "light" as const,
        })),
    };
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MapLegend } from "./map";

describe("MapLegend", () => {
    it("renders one row per entry", () => {
        render(
            <MapLegend
                entries={[
                    { variant: "serviceOffer", label: "Offre" },
                    { variant: "incident", label: "Incident" },
                ]}
            />,
        );
        expect(screen.getByText("Offre")).toBeTruthy();
        expect(screen.getByText("Incident")).toBeTruthy();
    });

    it("renders nothing when entries is empty", () => {
        const { container } = render(<MapLegend entries={[]} />);
        expect(container.firstChild).toBeNull();
    });
});
