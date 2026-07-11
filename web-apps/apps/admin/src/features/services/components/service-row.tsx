import { Edit01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslation } from "react-i18next";
import type { Service } from "@workspace/shared/lib/types";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { TableCell, TableRow } from "@workspace/ui/components/table";
import { ServiceDeleteDialog } from "./service-delete-dialog";

export function ServiceRow({
    service,
    neighborhoodName,
    deletePending,
    onEdit,
    onDelete,
}: {
    service: Service;
    neighborhoodName: string;
    deletePending: boolean;
    onEdit: (service: Service) => void;
    onDelete: (id: string) => void;
}) {
    const { t } = useTranslation();

    return (
        <TableRow>
            <TableCell className="py-2 font-medium">{service.title}</TableCell>
            <TableCell className="py-2">
                <Badge variant="secondary">
                    {t(`pages.services.categories.${service.category}`, {
                        defaultValue: service.category,
                    })}
                </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground py-2 text-sm">
                {service.neighborhoodId ? neighborhoodName || "—" : "—"}
            </TableCell>
            <TableCell className="py-2 text-right">
                <div className="flex items-center justify-end gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => onEdit(service)}
                    >
                        <HugeiconsIcon icon={Edit01Icon} />
                        {t("adminPages.common.edit")}
                    </Button>
                    <ServiceDeleteDialog
                        title={service.title}
                        disabled={deletePending}
                        onConfirm={() => onDelete(service._id)}
                    />
                </div>
            </TableCell>
        </TableRow>
    );
}
