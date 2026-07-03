import { describe, expect, it } from "vitest";
import { buildImportContractFormData } from "../hooks/useContracts";
import type { SignatureZone } from "../types";

const zones: SignatureZone[] = [
    { page: 1, x: 0.1, y: 0.8, w: 0.24, h: 0.08, signerId: "u1", kind: "signature" },
    { page: 2, x: 0.7, y: 0.05, w: 0.1, h: 0.06, signerId: "u2", kind: "initials" },
];

describe("buildImportContractFormData", () => {
    it("builds the multipart payload expected by POST /contracts/import", () => {
        const file = new File(["%PDF-1.4"], "bail.pdf", {
            type: "application/pdf",
        });

        const formData = buildImportContractFormData({
            file,
            title: "Bail de garage",
            signatories: ["u1", "u2"],
            zones,
        });

        expect(formData.get("file")).toBe(file);
        expect(formData.get("title")).toBe("Bail de garage");
        expect(JSON.parse(formData.get("signatories") as string)).toEqual([
            "u1",
            "u2",
        ]);
        expect(JSON.parse(formData.get("zones") as string)).toEqual(zones);
    });
});
