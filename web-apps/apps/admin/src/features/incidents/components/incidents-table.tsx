import { useTranslation } from "react-i18next";
import type { Incident } from "@workspace/shared/lib/types";
import { SortableHead } from "@workspace/ui/components/sortable-head";
import {
    Table,
    TableBody,
    TableHead,
    TableHeader,
    TableRow,
} from "@workspace/ui/components/table";
import { IncidentRow } from "./incident-row";

export function IncidentsTable({
    incidents,
    sort,
    order,
    onSort,
    updatePending,
    deletePending,
    onAdvance,
    onDelete,
}: {
    incidents: Incident[];
    sort: string;
    order: "asc" | "desc";
    onSort: (field: string) => void;
    updatePending: boolean;
    deletePending: boolean;
    onAdvance: (
        id: string,
        status: "open" | "in_progress" | "resolved",
    ) => void;
    onDelete: (incident: Incident) => void;
}) {
    const { t } = useTranslation();
    const sortDirection = (field: string) => (sort === field ? order : null);

    return (
        <div className="bg-card rounded-lg border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t("incidents.fields.title")}</TableHead>
                        <SortableHead
                            direction={sortDirection("status")}
                            onSort={() => onSort("status")}
                        >
                            {t("adminPages.incidents.statusColumn")}
                        </SortableHead>
                        <TableHead>
                            {t("adminPages.incidents.categoryColumn")}
                        </TableHead>
                        <SortableHead
                            direction={sortDirection("createdAt")}
                            onSort={() => onSort("createdAt")}
                        >
                            {t("adminPages.incidents.reportedAt")}
                        </SortableHead>
                        <TableHead className="text-right">
                            {t("adminPages.common.action")}
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {incidents.map((incident) => (
                        <IncidentRow
                            key={incident.id}
                            incident={incident}
                            updatePending={updatePending}
                            deletePending={deletePending}
                            onAdvance={onAdvance}
                            onDelete={onDelete}
                        />
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
