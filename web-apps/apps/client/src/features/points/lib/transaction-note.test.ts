import { describe, expect, it } from "vitest";
import type { PointTransaction } from "@workspace/shared/lib/types";
import { localizedTransactionNote } from "./transaction-note";

const echo = (key: string, options?: Record<string, unknown>) =>
    options ? `${key}:${JSON.stringify(options)}` : key;

function transaction(
    overrides: Partial<PointTransaction> = {},
): PointTransaction {
    return {
        id: "t1",
        senderId: "s1",
        recipientId: "r1",
        amount: 10,
        note: null,
        senderEmail: null,
        recipientEmail: null,
        senderName: null,
        recipientName: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        ...overrides,
    };
}

describe("localizedTransactionNote", () => {
    it("localizes a service payment with the parsed service title", () => {
        const note = localizedTransactionNote(
            transaction({
                type: "service_payment",
                note: "Service payment: Dog walking",
            }),
            echo,
        );
        expect(note).toBe(
            'pages.points.servicePaymentFor:{"service":"Dog walking"}',
        );
    });

    it("falls back to a generic label when the note does not match", () => {
        const note = localizedTransactionNote(
            transaction({ type: "service_payment", note: "unexpected" }),
            echo,
        );
        expect(note).toBe("pages.points.servicePayment");
    });

    it("returns the raw note for non-service transactions", () => {
        const note = localizedTransactionNote(
            transaction({ type: "bonus", note: "Welcome gift" }),
            echo,
        );
        expect(note).toBe("Welcome gift");
    });
});
