import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import {
    Map,
    Marker,
    NeighborhoodPolygon,
    UserLocation,
    useFitBounds,
} from "./map";

describe("<Map>", () => {
    it("renders a leaflet container with given className", () => {
        const { container } = render(
            <Map center={[48.8566, 2.3522]} zoom={13} className="h-[400px]" />,
        );
        const root = container.querySelector(".leaflet-container");
        expect(root).not.toBeNull();
        expect(root?.className).toContain("h-[400px]");
    });
});

describe("<Marker>", () => {
    it("renders with service variant class", () => {
        const { container } = render(
            <Map center={[48.85, 2.35]}>
                <Marker variant="service" position={[48.85, 2.35]} />
            </Map>,
        );
        expect(container.querySelector(".qc-marker--service")).not.toBeNull();
    });

    it("renders with incident variant class", () => {
        const { container } = render(
            <Map center={[48.85, 2.35]}>
                <Marker variant="incident" position={[48.85, 2.35]} />
            </Map>,
        );
        expect(container.querySelector(".qc-marker--incident")).not.toBeNull();
    });

    it("defaults to the default variant when none specified", () => {
        const { container } = render(
            <Map center={[48.85, 2.35]}>
                <Marker position={[48.85, 2.35]} />
            </Map>,
        );
        expect(container.querySelector(".qc-marker--default")).not.toBeNull();
    });
});

describe("<NeighborhoodPolygon>", () => {
    it("renders a polygon path from GeoJSON geometry", () => {
        const geom: GeoJSON.Polygon = {
            type: "Polygon",
            coordinates: [
                [
                    [2.34, 48.88],
                    [2.35, 48.88],
                    [2.35, 48.89],
                    [2.34, 48.89],
                    [2.34, 48.88],
                ],
            ],
        };
        const { container } = render(
            <Map center={[48.88, 2.345]}>
                <NeighborhoodPolygon geometry={geom} label="Test" />
            </Map>,
        );
        expect(container.querySelector("svg path")).not.toBeNull();
    });
});

describe("<UserLocation>", () => {
    beforeEach(() => {
        Object.defineProperty(globalThis.navigator, "geolocation", {
            value: undefined,
            configurable: true,
        });
    });

    it("calls navigator.geolocation.getCurrentPosition when supported", () => {
        const getPos = vi.fn(
            (success: (pos: {
                coords: { latitude: number; longitude: number };
            }) => void) =>
                success({ coords: { latitude: 48.85, longitude: 2.35 } }),
        );
        Object.defineProperty(globalThis.navigator, "geolocation", {
            value: { getCurrentPosition: getPos },
            configurable: true,
        });
        const onLocate = vi.fn();
        render(
            <Map center={[48.85, 2.35]}>
                <UserLocation
                    onLocate={onLocate}
                    fallbackCenter={[48.85, 2.35]}
                />
            </Map>,
        );
        expect(getPos).toHaveBeenCalled();
        expect(onLocate).toHaveBeenCalledWith({ lat: 48.85, lng: 2.35 });
    });

    it("does not throw when geolocation is unavailable", () => {
        expect(() =>
            render(
                <Map center={[48.85, 2.35]}>
                    <UserLocation fallbackCenter={[48.85, 2.35]} />
                </Map>,
            ),
        ).not.toThrow();
    });
});

describe("useFitBounds", () => {
    function TestComponent({ positions }: { positions: [number, number][] }) {
        const ref = useFitBounds(positions);
        return <Map center={[48.85, 2.35]} ref={ref} />;
    }

    it("returns a ref valid for an empty positions array", () => {
        expect(() => render(<TestComponent positions={[]} />)).not.toThrow();
    });

    it("does not throw for a non-empty positions array", () => {
        expect(() =>
            render(
                <TestComponent
                    positions={[
                        [48.85, 2.35],
                        [48.86, 2.36],
                    ]}
                />,
            ),
        ).not.toThrow();
    });
});
