import { Edit01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslation } from "react-i18next";
import type { Event } from "@workspace/shared/lib/types";
import { Button } from "@workspace/ui/components/button";
import { TableCell, TableRow } from "@workspace/ui/components/table";
import { EventDeleteDialog } from "./event-delete-dialog";

export function EventRow({
    event,
    neighborhoodName,
    deletePending,
    onEdit,
    onDelete,
}: {
    event: Event;
    neighborhoodName: string;
    deletePending: boolean;
    onEdit: (event: Event) => void;
    onDelete: (id: string) => void;
}) {
    const { t, i18n } = useTranslation();

    return (
        <TableRow>
            <TableCell className="py-2 font-medium">{event.title}</TableCell>
            <TableCell className="text-muted-foreground py-2 text-sm whitespace-nowrap tabular-nums">
                {new Date(event.date).toLocaleDateString(i18n.language, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                })}
            </TableCell>
            <TableCell className="text-muted-foreground py-2 text-sm">
                {event.address || "—"}
            </TableCell>
            <TableCell className="text-muted-foreground py-2 text-sm">
                {neighborhoodName || "—"}
            </TableCell>
            <TableCell className="py-2 text-right">
                <div className="flex items-center justify-end gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => onEdit(event)}
                    >
                        <HugeiconsIcon icon={Edit01Icon} />
                        {t("adminPages.common.edit")}
                    </Button>
                    <EventDeleteDialog
                        title={event.title}
                        disabled={deletePending}
                        onConfirm={() => onDelete(event._id)}
                    />
                </div>
            </TableCell>
        </TableRow>
    );
}
