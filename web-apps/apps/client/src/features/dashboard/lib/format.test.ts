import { describe, expect, it } from "vitest";
import { formatPointsDelta, resolveCounterparty } from "./format";

describe("formatPointsDelta", () => {
    it("prefixes + when received and − when sent, using absolute value", () => {
        expect(formatPointsDelta(true, 5)).toBe("+5");
        expect(formatPointsDelta(false, 5)).toBe("−5");
        expect(formatPointsDelta(false, -5)).toBe("−5");
    });
});

describe("resolveCounterparty", () => {
    const me = "me@x.fr";
    it("is the sender when I received the points", () => {
        const r = resolveCounterparty(
            { id: "1", amount: 5, recipientEmail: me, senderName: "Alice", senderEmail: "a@x.fr" },
            me,
        );
        expect(r).toEqual({ received: true, name: "Alice" });
    });
    it("is the recipient (email fallback) when I sent the points", () => {
        const r = resolveCounterparty(
            { id: "2", amount: 5, recipientEmail: "b@x.fr", senderEmail: me },
            me,
        );
        expect(r).toEqual({ received: false, name: "b@x.fr" });
    });
    it("falls back to a dash when no name/email is present", () => {
        const r = resolveCounterparty({ id: "3", amount: 5, recipientEmail: me }, me);
        expect(r.name).toBe("—");
    });
});
