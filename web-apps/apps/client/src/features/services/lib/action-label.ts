type TFunction = (key: string, options?: Record<string, unknown>) => string;

export function actionLabel(
    direction: "offer" | "request",
    hasResponded: boolean,
    t: TFunction,
): string {
    if (hasResponded) return t("pages.services.respondedCta");
    if (direction === "request") return t("pages.services.proposeCta");
    return t("pages.services.interestedCta");
}

export function formatResponderCount(n: number, t: TFunction): string {
    return t("pages.services.responderCount", { count: n });
}
