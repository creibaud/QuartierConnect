import { describe, expect, it } from "vitest";
import { nextIncidentStatus } from "./next-status";

describe("nextIncidentStatus", () => {
    it("advances an open incident to in_progress", () => {
        expect(nextIncidentStatus("open")?.value).toBe("in_progress");
        expect(nextIncidentStatus("open")?.labelKey).toBe(
            "pages.incidentDetail.moveToInProgress",
        );
    });

    it("advances an in_progress incident to resolved", () => {
        expect(nextIncidentStatus("in_progress")?.value).toBe("resolved");
        expect(nextIncidentStatus("in_progress")?.labelKey).toBe(
            "pages.incidentDetail.markResolved",
        );
    });

    it("has no next status once resolved", () => {
        expect(nextIncidentStatus("resolved")).toBeNull();
    });

    it("returns null for an unknown status", () => {
        expect(nextIncidentStatus("unknown")).toBeNull();
    });
});
