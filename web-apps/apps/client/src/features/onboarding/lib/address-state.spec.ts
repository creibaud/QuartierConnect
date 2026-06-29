import { describe, expect, it } from "vitest";
import { gateState } from "./address-state";

describe("gateState", () => {
    it("ok when address + neighborhood", () => {
        expect(gateState({ hasAddress: true, neighborhoodId: "nb" })).toBe("ok");
    });
    it("needs-address when no address", () => {
        expect(gateState({ hasAddress: false, neighborhoodId: null })).toBe("needs-address");
    });
    it("pending when address but no neighborhood", () => {
        expect(gateState({ hasAddress: true, neighborhoodId: null })).toBe("pending");
    });
});
