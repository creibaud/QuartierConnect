import "@testing-library/jest-dom";
import { vi } from "vitest";

// JSDOM lacks matchMedia; provide a minimal stub.
if (typeof window !== "undefined") {
    Object.defineProperty(window, "matchMedia", {
        value: () => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn() }),
    });
}

// JSDOM lacks ResizeObserver
class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
