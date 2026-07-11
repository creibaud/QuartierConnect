import type { PointTransaction } from "@workspace/shared/lib/types";

type TranslateFunction = (
    key: string,
    options?: Record<string, unknown>,
) => string;

const SERVICE_PAYMENT_NOTE_PATTERN = /^Service payment: (.+)$/;

export function localizedTransactionNote(
    transaction: PointTransaction,
    t: TranslateFunction,
): string | null {
    if (transaction.type === "service_payment") {
        const serviceTitle = transaction.note?.match(
            SERVICE_PAYMENT_NOTE_PATTERN,
        )?.[1];
        return serviceTitle
            ? t("pages.points.servicePaymentFor", { service: serviceTitle })
            : t("pages.points.servicePayment");
    }
    return transaction.note;
}
