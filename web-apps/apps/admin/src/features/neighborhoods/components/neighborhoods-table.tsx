import { useTranslation } from "react-i18next";
import type { Neighborhood } from "@workspace/shared/lib/types";
import { SortableHead } from "@workspace/ui/components/sortable-head";
import {
    Table,
    TableBody,
    TableHead,
    TableHeader,
    TableRow,
} from "@workspace/ui/components/table";
import { NeighborhoodRow } from "./neighborhood-row";

export function NeighborhoodsTable({
    neighborhoods,
    sort,
    order,
    onSort,
    deletePending,
    onEdit,
    onDelete,
}: {
    neighborhoods: Neighborhood[];
    sort: string;
    order: "asc" | "desc";
    onSort: (field: string) => void;
    deletePending: boolean;
    onEdit: (neighborhood: Neighborhood) => void;
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
                            direction={sortDirection("name")}
                            onSort={() => onSort("name")}
                        >
                            {t("adminPages.common.name")}
                        </SortableHead>
                        <TableHead>
                            {t("adminPages.neighborhoods.city")}
                        </TableHead>
                        <TableHead>
                            {t("adminPages.neighborhoods.polygon")}
                        </TableHead>
                        <TableHead className="text-right">
                            {t("adminPages.common.actions")}
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {neighborhoods.map((neighborhood) => (
                        <NeighborhoodRow
                            key={neighborhood._id}
                            neighborhood={neighborhood}
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
