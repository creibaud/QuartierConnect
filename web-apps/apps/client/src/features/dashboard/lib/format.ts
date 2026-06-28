export interface PointsTransactionLike {
    id: string;
    amount: number;
    recipientEmail?: string;
    senderEmail?: string;
    recipientName?: string | null;
    senderName?: string | null;
}

export function formatEventDate(date: string | number | Date, locale?: string): string {
    return new Date(date).toLocaleDateString(locale, { day: "numeric", month: "short" });
}

export function formatPointsDelta(received: boolean, amount: number): string {
    return `${received ? "+" : "−"}${Math.abs(amount)}`;
}

export function resolveCounterparty(
    tx: PointsTransactionLike,
    currentEmail: string,
): { received: boolean; name: string } {
    const received = tx.recipientEmail === currentEmail;
    const name = received
        ? (tx.senderName ?? tx.senderEmail)
        : (tx.recipientName ?? tx.recipientEmail);
    return { received, name: name ?? "—" };
}
