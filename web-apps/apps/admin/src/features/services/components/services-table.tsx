import { useTranslation } from "react-i18next";
import type { Service } from "@workspace/shared/lib/types";
import { SortableHead } from "@workspace/ui/components/sortable-head";
import {
    Table,
    TableBody,
    TableHead,
    TableHeader,
    TableRow,
} from "@workspace/ui/components/table";
import { ServiceRow } from "./service-row";

export function ServicesTable({
    services,
    neighborhoodNames,
    sort,
    order,
    onSort,
    deletePending,
    onEdit,
    onDelete,
}: {
    services: Service[];
    neighborhoodNames: Record<string, string>;
    sort: string;
    order: "asc" | "desc";
    onSort: (field: string) => void;
    deletePending: boolean;
    onEdit: (service: Service) => void;
    onDelete: (id: string) => void;
}) {
    const { t } = useTranslation();
    const sortDirection = (field: string) => (sort === field ? order : null);

    return (
        <div className="bg-card rounded-lg border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <SortableHead
                            direction={sortDirection("title")}
                            onSort={() => onSort("title")}
                        >
                            {t("adminPages.common.name")}
                        </SortableHead>
                        <TableHead>
                            {t("adminPages.services.category")}
                        </TableHead>
                        <TableHead>
                            {t("incidents.fields.neighborhood")}
                        </TableHead>
                        <TableHead className="text-right">
                            {t("adminPages.common.actions")}
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {services.map((service) => (
                        <ServiceRow
                            key={service._id}
                            service={service}
                            neighborhoodName={
                                service.neighborhoodId
                                    ? (neighborhoodNames[
                                          service.neighborhoodId
                                      ] ?? "")
                                    : ""
                            }
                            deletePending={deletePending}
                            onEdit={onEdit}
                            onDelete={onDelete}
                        />
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
