import { describe, expect, it } from "vitest";
import { isValidPhone, normalizePhone } from "./phone";

describe("normalizePhone", () => {
    it("strips spaces, dots, dashes and parentheses", () => {
        expect(normalizePhone("+33 6 12.34-56(78)")).toBe("+33612345678");
    });

    it("keeps a bare number untouched", () => {
        expect(normalizePhone("0612345678")).toBe("0612345678");
    });
});

describe("isValidPhone", () => {
    it("accepts an E.164 international number", () => {
        expect(isValidPhone("+33612345678")).toBe(true);
    });

    it("accepts a national number with separators", () => {
        expect(isValidPhone("06 12 34 56 78")).toBe(true);
    });

    it("rejects letters", () => {
        expect(isValidPhone("06AB345678")).toBe(false);
    });

    it("rejects numbers that are too short", () => {
        expect(isValidPhone("12345")).toBe(false);
    });

    it("rejects numbers that are too long", () => {
        expect(isValidPhone("+1234567890123456")).toBe(false);
    });
});
