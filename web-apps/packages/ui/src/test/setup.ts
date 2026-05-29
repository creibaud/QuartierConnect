import "@testing-library/jest-dom";
import { vi } from "vitest";

// Leaflet relies on browser APIs not in JSDOM. Mock minimal surface.
if (typeof window !== "undefined") {
    Object.defineProperty(window, "matchMedia", {
        value: () => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn() }),
    });
}

// react-leaflet expects ResizeObserver
class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
