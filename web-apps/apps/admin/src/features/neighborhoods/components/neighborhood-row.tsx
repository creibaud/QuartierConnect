import {
    CheckmarkCircle01Icon,
    Edit01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslation } from "react-i18next";
import type { Neighborhood } from "@workspace/shared/lib/types";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { TableCell, TableRow } from "@workspace/ui/components/table";
import { NeighborhoodDeleteDialog } from "./neighborhood-delete-dialog";

export function NeighborhoodRow({
    neighborhood,
    deletePending,
    onEdit,
    onDelete,
}: {
    neighborhood: Neighborhood;
    deletePending: boolean;
    onEdit: (neighborhood: Neighborhood) => void;
    onDelete: (id: string) => void;
}) {
    const { t } = useTranslation();

    return (
        <TableRow>
            <TableCell className="py-2 font-medium">
                {neighborhood.name}
            </TableCell>
            <TableCell className="text-muted-foreground py-2">
                {neighborhood.city}
            </TableCell>
            <TableCell className="py-2">
                {neighborhood.geometry ? (
                    <Badge variant="outline">
                        <HugeiconsIcon icon={CheckmarkCircle01Icon} />
                        {t("adminPages.neighborhoods.defined")}
                    </Badge>
                ) : (
                    <Badge variant="secondary">
                        {t("adminPages.neighborhoods.notDefined")}
                    </Badge>
                )}
            </TableCell>
            <TableCell className="py-2 text-right">
                <div className="flex items-center justify-end gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => onEdit(neighborhood)}
                    >
                        <HugeiconsIcon icon={Edit01Icon} />
                        {t("adminPages.common.edit")}
                    </Button>
                    <NeighborhoodDeleteDialog
                        name={neighborhood.name}
                        pending={deletePending}
                        onConfirm={() => onDelete(neighborhood._id)}
                    />
                </div>
            </TableCell>
        </TableRow>
    );
}
