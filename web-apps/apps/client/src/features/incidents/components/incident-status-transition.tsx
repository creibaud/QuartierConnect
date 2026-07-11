import { useTranslation } from "react-i18next";
import { HugeiconsIcon } from "@hugeicons/react";
import { getCurrentUser } from "@workspace/shared/lib/auth";
import { useUpdateIncidentStatus } from "@workspace/shared/lib/hooks/incidents.hooks";
import type { Incident } from "@workspace/shared/lib/types";
import { Button } from "@workspace/ui/components/button";
import { toast } from "sonner";
import { nextIncidentStatus } from "../lib/next-status";

export function IncidentStatusTransition({
    id,
    status,
}: {
    id: string;
    status: Incident["status"];
}) {
    const { t } = useTranslation();
    const user = getCurrentUser();
    const updateStatus = useUpdateIncidentStatus();

    const canTransition = user?.role === "moderator" || user?.role === "admin";
    const nextStatus = nextIncidentStatus(status);

    if (!canTransition || !nextStatus) return null;

    return (
        <div className="border-t pt-4">
            <Button
                variant="secondary"
                disabled={updateStatus.isPending}
                onClick={() =>
                    updateStatus.mutate(
                        { id, status: nextStatus.value },
                        {
                            onSuccess: () =>
                                toast.success(
                                    t("pages.incidentDetail.statusUpdated"),
                                ),
                            onError: () =>
                                toast.error(
                                    t("pages.incidentDetail.statusUpdateError"),
                                ),
                        },
                    )
                }
            >
                <HugeiconsIcon icon={nextStatus.icon} />
                {updateStatus.isPending
                    ? t("pages.incidentDetail.updating")
                    : t(nextStatus.labelKey)}
            </Button>
        </div>
    );
}
