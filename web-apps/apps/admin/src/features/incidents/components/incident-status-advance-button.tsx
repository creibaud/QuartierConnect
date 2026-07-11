import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslation } from "react-i18next";
import type { Incident } from "@workspace/shared/lib/types";
import { Button } from "@workspace/ui/components/button";
import { Spinner } from "@workspace/ui/components/spinner";
import { NEXT_STATUSES, statusLabel } from "../lib/incident-status";

export function IncidentStatusAdvanceButton({
    incident,
    pending,
    onAdvance,
}: {
    incident: Incident;
    pending: boolean;
    onAdvance: (
        id: string,
        status: "open" | "in_progress" | "resolved",
    ) => void;
}) {
    const { t } = useTranslation();
    const nextStatus = NEXT_STATUSES[incident.status]?.[0];

    if (!nextStatus) {
        return (
            <span className="text-muted-foreground text-xs">
                {t("adminPages.incidents.done")}
            </span>
        );
    }

    return (
        <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => onAdvance(incident.id, nextStatus)}
        >
            {pending ? (
                <Spinner className="mr-2" />
            ) : (
                <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    className="mr-1.5 size-3.5"
                />
            )}
            {statusLabel(t, nextStatus)}
        </Button>
    );
}
