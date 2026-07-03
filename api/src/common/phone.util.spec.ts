import { normalizePhone } from "./phone.util";

describe("normalizePhone", () => {
    it("strips spaces, dots, parentheses and dashes", () => {
        expect(normalizePhone("+33 6.12(34)56-78")).toBe("+33612345678");
    });

    it("keeps an already normalized number unchanged", () => {
        expect(normalizePhone("+33612345678")).toBe("+33612345678");
    });

    it("returns null for null input", () => {
        expect(normalizePhone(null)).toBeNull();
    });

    it("returns null for undefined input", () => {
        expect(normalizePhone(undefined)).toBeNull();
    });

    it("returns null when only separators are provided", () => {
        expect(normalizePhone(" .-() ")).toBeNull();
    });
});
