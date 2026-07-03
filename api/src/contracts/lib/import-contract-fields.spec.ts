import { BadRequestException } from "@nestjs/common";
import { SignatureZoneKind } from "../schemas/contract.schema";
import {
    MAX_IMPORT_SIGNATORIES,
    parseSignatories,
    parseSignatureZones,
} from "./import-contract-fields";

const CALLER = "user-1";

describe("parseSignatories", () => {
    it("accepts a valid list including the caller", () => {
        const ids = parseSignatories('["user-1","user-2"]', CALLER);
        expect(ids).toEqual(["user-1", "user-2"]);
    });

    it("accepts the caller alone", () => {
        expect(parseSignatories('["user-1"]', CALLER)).toEqual(["user-1"]);
    });

    it("rejects invalid JSON", () => {
        expect(() => parseSignatories("not-json", CALLER)).toThrow(
            BadRequestException,
        );
    });

    it("rejects a non-array payload", () => {
        expect(() => parseSignatories('{"a":1}', CALLER)).toThrow(
            BadRequestException,
        );
    });

    it("rejects non-string entries", () => {
        expect(() => parseSignatories('["user-1", 42]', CALLER)).toThrow(
            BadRequestException,
        );
    });

    it("rejects empty-string entries", () => {
        expect(() => parseSignatories('["user-1", ""]', CALLER)).toThrow(
            BadRequestException,
        );
    });

    it("rejects an empty list", () => {
        expect(() => parseSignatories("[]", CALLER)).toThrow(
            BadRequestException,
        );
    });

    it(`rejects more than ${MAX_IMPORT_SIGNATORIES} signatories`, () => {
        const five = JSON.stringify(["user-1", "u2", "u3", "u4", "u5"]);
        expect(() => parseSignatories(five, CALLER)).toThrow(
            BadRequestException,
        );
    });

    it("rejects duplicate ids", () => {
        expect(() => parseSignatories('["user-1","user-1"]', CALLER)).toThrow(
            BadRequestException,
        );
    });

    it("rejects a list that excludes the caller", () => {
        expect(() => parseSignatories('["user-2","user-3"]', CALLER)).toThrow(
            /include the importing user/,
        );
    });
});

function zoneJson(overrides: Record<string, unknown> = {}): string {
    return JSON.stringify([
        {
            page: 1,
            x: 0.1,
            y: 0.7,
            w: 0.3,
            h: 0.1,
            signerId: "user-1",
            kind: "signature",
            ...overrides,
        },
    ]);
}

describe("parseSignatureZones", () => {
    const signatories = ["user-1"];

    it("accepts a valid zone and returns only the known fields", () => {
        const zones = parseSignatureZones(
            zoneJson({ extra: "stripped" }),
            signatories,
        );
        expect(zones).toEqual([
            {
                page: 1,
                x: 0.1,
                y: 0.7,
                w: 0.3,
                h: 0.1,
                signerId: "user-1",
                kind: SignatureZoneKind.SIGNATURE,
            },
        ]);
    });

    it("accepts edge coordinates filling the whole page", () => {
        const zones = parseSignatureZones(
            zoneJson({ x: 0, y: 0, w: 1, h: 1 }),
            signatories,
        );
        expect(zones[0].w).toBe(1);
    });

    it("accepts the initials kind", () => {
        const zones = parseSignatureZones(
            zoneJson({ kind: "initials" }),
            signatories,
        );
        expect(zones[0].kind).toBe(SignatureZoneKind.INITIALS);
    });

    it("rejects invalid JSON", () => {
        expect(() => parseSignatureZones("nope", signatories)).toThrow(
            BadRequestException,
        );
    });

    it("rejects an empty array", () => {
        expect(() => parseSignatureZones("[]", signatories)).toThrow(
            BadRequestException,
        );
    });

    it("rejects non-object entries", () => {
        expect(() => parseSignatureZones("[1]", signatories)).toThrow(
            BadRequestException,
        );
    });

    it.each([
        ["page zero", { page: 0 }],
        ["fractional page", { page: 1.5 }],
        ["negative x", { x: -0.01 }],
        ["y above 1", { y: 1.01 }],
        ["zero width", { w: 0 }],
        ["height above 1", { h: 1.2 }],
        ["non-numeric x", { x: "0.5" }],
        ["overflow right (x+w > 1)", { x: 0.8, w: 0.3 }],
        ["overflow bottom (y+h > 1)", { y: 0.95, h: 0.1 }],
        ["unknown kind", { kind: "stamp" }],
        ["signer not a signatory", { signerId: "user-9" }],
    ])("rejects %s", (_label, overrides) => {
        expect(() =>
            parseSignatureZones(zoneJson(overrides), signatories),
        ).toThrow(BadRequestException);
    });

    it("rejects when a signatory has no zone", () => {
        expect(() =>
            parseSignatureZones(zoneJson(), ["user-1", "user-2"]),
        ).toThrow(/missing: user-2/);
    });

    it("accepts several zones per signer across pages", () => {
        const raw = JSON.stringify([
            {
                page: 1,
                x: 0.1,
                y: 0.8,
                w: 0.25,
                h: 0.08,
                signerId: "user-1",
                kind: "signature",
            },
            {
                page: 3,
                x: 0.85,
                y: 0.9,
                w: 0.1,
                h: 0.05,
                signerId: "user-1",
                kind: "initials",
            },
            {
                page: 2,
                x: 0.5,
                y: 0.8,
                w: 0.3,
                h: 0.1,
                signerId: "user-2",
                kind: "signature",
            },
        ]);
        const zones = parseSignatureZones(raw, ["user-1", "user-2"]);
        expect(zones).toHaveLength(3);
        expect(zones.map((zone) => zone.page)).toEqual([1, 3, 2]);
    });
});
