import {
    ArrowRight01Icon,
    CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";

export interface IncidentStatusTransition {
    value: "open" | "in_progress" | "resolved";
    labelKey: string;
    icon: IconSvgElement;
}

export const NEXT_STATUS_VALUES: Record<
    string,
    IncidentStatusTransition | null
> = {
    open: {
        value: "in_progress",
        labelKey: "pages.incidentDetail.moveToInProgress",
        icon: ArrowRight01Icon,
    },
    in_progress: {
        value: "resolved",
        labelKey: "pages.incidentDetail.markResolved",
        icon: CheckmarkCircle02Icon,
    },
    resolved: null,
};

export function nextIncidentStatus(
    status: string,
): IncidentStatusTransition | null {
    return NEXT_STATUS_VALUES[status] ?? null;
}
