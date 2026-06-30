import { describe, expect, it } from "vitest";
import { actionLabel } from "./action-label";
const t = ((k: string) => k) as never;
describe("actionLabel", () => {
    it("offer → interested, request → propose", () => {
        expect(actionLabel("offer", false, t)).toBe("pages.services.interestedCta");
        expect(actionLabel("request", false, t)).toBe("pages.services.proposeCta");
    });
    it("hasResponded overrides", () => {
        expect(actionLabel("offer", true, t)).toBe("pages.services.respondedCta");
    });
});
