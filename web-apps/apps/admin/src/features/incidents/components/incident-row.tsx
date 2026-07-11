import { useTranslation } from "react-i18next";
import type { Incident } from "@workspace/shared/lib/types";
import {
    StatusBadge,
    statusTone,
} from "@workspace/ui/components/status-badge";
import { TableCell, TableRow } from "@workspace/ui/components/table";
import { categoryKey, statusLabel } from "../lib/incident-status";
import { IncidentDeleteDialog } from "./incident-delete-dialog";
import { IncidentStatusAdvanceButton } from "./incident-status-advance-button";

export function IncidentRow({
    incident,
    updatePending,
    deletePending,
    onAdvance,
    onDelete,
}: {
    incident: Incident;
    updatePending: boolean;
    deletePending: boolean;
    onAdvance: (
        id: string,
        status: "open" | "in_progress" | "resolved",
    ) => void;
    onDelete: (incident: Incident) => void;
}) {
    const { t, i18n } = useTranslation();

    return (
        <TableRow>
            <TableCell className="max-w-xs truncate py-2 font-medium">
                {incident.title}
            </TableCell>
            <TableCell className="py-2">
                <StatusBadge tone={statusTone(incident.status)}>
                    {statusLabel(t, incident.status)}
                </StatusBadge>
            </TableCell>
            <TableCell className="text-muted-foreground py-2 text-sm">
                {t(categoryKey(incident.category))}
            </TableCell>
            <TableCell className="text-muted-foreground py-2 text-sm tabular-nums">
                {new Date(incident.createdAt).toLocaleDateString(i18n.language)}
            </TableCell>
            <TableCell className="py-2 text-right">
                <div className="flex items-center justify-end gap-2">
                    <IncidentStatusAdvanceButton
                        incident={incident}
                        pending={updatePending}
                        onAdvance={onAdvance}
                    />
                    <IncidentDeleteDialog
                        title={incident.title}
                        disabled={deletePending}
                        onConfirm={() => onDelete(incident)}
                    />
                </div>
            </TableCell>
        </TableRow>
    );
}
