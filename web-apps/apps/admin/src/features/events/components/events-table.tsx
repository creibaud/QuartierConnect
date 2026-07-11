import { useTranslation } from "react-i18next";
import type { Event } from "@workspace/shared/lib/types";
import { SortableHead } from "@workspace/ui/components/sortable-head";
import {
    Table,
    TableBody,
    TableHead,
    TableHeader,
    TableRow,
} from "@workspace/ui/components/table";
import { EventRow } from "./event-row";

export function EventsTable({
    events,
    neighborhoodNames,
    sort,
    order,
    onSort,
    deletePending,
    onEdit,
    onDelete,
}: {
    events: Event[];
    neighborhoodNames: Record<string, string>;
    sort: string;
    order: "asc" | "desc";
    onSort: (field: string) => void;
    deletePending: boolean;
    onEdit: (event: Event) => void;
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
                            {t("adminPages.events.titleColumn")}
                        </SortableHead>
                        <SortableHead
                            direction={sortDirection("date")}
                            onSort={() => onSort("date")}
                        >
                            {t("adminPages.events.dateColumn")}
                        </SortableHead>
                        <TableHead>
                            {t("adminPages.events.placeColumn")}
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
                    {events.map((event) => (
                        <EventRow
                            key={event._id}
                            event={event}
                            neighborhoodName={
                                neighborhoodNames[event.neighborhoodId] ?? ""
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
