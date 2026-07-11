import type { Contract } from "@workspace/shared/lib/types";

type TFunction = (key: string, options?: Record<string, unknown>) => string;

export function contractStatusLabels(t: TFunction): Record<string, string> {
    return {
        draft: t("contracts.status.draft"),
        partial: t("contracts.status.partial"),
        fully_signed: t("contracts.status.fully_signed"),
        cancelled: t("contracts.status.cancelled"),
    };
}

export function canSignContract(
    contract: Contract,
    userId: string | undefined,
): boolean {
    return (
        !!userId &&
        contract.signatories.includes(userId) &&
        !contract.signatures.some((s) => s.userId === userId) &&
        contract.status !== "fully_signed" &&
        contract.status !== "cancelled"
    );
}

export function contractMeta(
    contract: Contract,
    t: TFunction,
    language: string,
): string {
    return [
        t("pages.contracts.signatureCount", {
            signed: contract.signatures.length,
            total: contract.signatories.length,
            count: contract.signatories.length,
        }),
        contract.signedAt
            ? t("pages.contracts.signedOnDate", {
                  date: new Date(contract.signedAt).toLocaleDateString(
                      language,
                  ),
              })
            : "",
    ]
        .filter(Boolean)
        .join(" · ");
}
