type TFunction = (key: string, options?: Record<string, unknown>) => string;

export function incidentStatusLabels(t: TFunction): Record<string, string> {
    return {
        open: t("incidents.status.open"),
        in_progress: t("incidents.status.in_progress"),
        resolved: t("incidents.status.resolved"),
    };
}
