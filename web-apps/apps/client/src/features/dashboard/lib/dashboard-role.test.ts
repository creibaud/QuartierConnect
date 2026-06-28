import { describe, expect, it } from "vitest";
import { isStaffRole } from "./dashboard-role";

describe("isStaffRole", () => {
    it("is true for moderator and admin", () => {
        expect(isStaffRole("moderator")).toBe(true);
        expect(isStaffRole("admin")).toBe(true);
    });
    it("is false for resident, banned, unknown and nullish", () => {
        expect(isStaffRole("resident")).toBe(false);
        expect(isStaffRole("banned")).toBe(false);
        expect(isStaffRole("other")).toBe(false);
        expect(isStaffRole(undefined)).toBe(false);
        expect(isStaffRole(null)).toBe(false);
    });
});
