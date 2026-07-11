import type { TFunction } from "i18next";

export function statusLabel(t: TFunction, status: string): string {
    const labels: Record<string, string> = {
        open: t("incidents.status.open"),
        in_progress: t("incidents.status.in_progress"),
        resolved: t("incidents.status.resolved"),
    };
    return labels[status] ?? status;
}

export function categoryKey(category: string): string {
    return `pages.incidents.categories.${category}`;
}

export const NEXT_STATUSES: Record<
    string,
    Array<"open" | "in_progress" | "resolved">
> = {
    open: ["in_progress"],
    in_progress: ["resolved"],
    resolved: [],
};
