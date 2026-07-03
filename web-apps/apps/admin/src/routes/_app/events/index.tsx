import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Add01Icon,
    Calendar01Icon,
    Delete01Icon,
    Edit01Icon,
    Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute } from "@tanstack/react-router";
import {
    useCreateEvent,
    useDeleteEvent,
    useEvents,
    useUpdateEvent,
} from "@workspace/shared/lib/hooks/events.hooks";
import { useNeighborhoods } from "@workspace/shared/lib/hooks/neighborhoods.hooks";
import type { Event, Neighborhood } from "@workspace/shared/lib/types";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog";
import { Button } from "@workspace/ui/components/button";
import { DataState } from "@workspace/ui/components/data-state";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@workspace/ui/components/dialog";
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@workspace/ui/components/empty";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { PageHeader } from "@workspace/ui/components/page-header";
import { DataPagination } from "@workspace/ui/components/pagination";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@workspace/ui/components/select";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { SortableHead } from "@workspace/ui/components/sortable-head";
import { Spinner } from "@workspace/ui/components/spinner";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@workspace/ui/components/table";
import { Textarea } from "@workspace/ui/components/textarea";
import { useTableSort } from "@workspace/ui/hooks/use-table-sort";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/events/")({
    component: AdminEventsPage,
});

const PAGE_SIZE = 10;

function AdminEventsPage() {
    const { t, i18n } = useTranslation();
    const [createOpen, setCreateOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Event | null>(null);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);

    const { data: eventsData, isLoading, isError, refetch } = useEvents(100);
    const { data: neighborhoodsData } = useNeighborhoods(100);
    const events = eventsData ?? [];
    const neighborhoods = neighborhoodsData ?? [];
    const deleteEvent = useDeleteEvent();

    const nbhMap = Object.fromEntries(
        neighborhoods.map((n) => [n._id, n.name]),
    );

    const query = search.trim().toLowerCase();
    const filteredEvents = events.filter(
        (evt) => query.length === 0 || evt.title.toLowerCase().includes(query),
    );

    const { sorted, toggle, getSortDirection } = useTableSort(filteredEvents, {
        initial: { key: "date", direction: "desc" },
        accessors: {
            date: (evt) => new Date(evt.date),
            neighborhood: (evt) => nbhMap[evt.neighborhoodId] ?? "",
        },
    });

    const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
    const currentPage = Math.min(page, pageCount);
    const pageRows = sorted.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE,
    );

    function handleDelete(id: string) {
        deleteEvent.mutate(id, {
            onSuccess: () => toast.success(t("adminPages.events.deleted")),
            onError: () => toast.error(t("adminPages.common.deleteError")),
        });
    }

    function handleSort(key: string) {
        toggle(key);
        setPage(1);
    }

    return (
        <div className="p-6">
            <div className="space-y-6">
                <PageHeader
                    title={t("adminPages.events.title")}
                    description={t("adminPages.events.description")}
                    actions={
                        <Button onClick={() => setCreateOpen(true)}>
                            <HugeiconsIcon icon={Add01Icon} />
                            {t("adminPages.common.create")}
                        </Button>
                    }
                />

                <div className="relative">
                    <HugeiconsIcon
                        icon={Search01Icon}
                        className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                    />
                    <Input
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                        placeholder={t("adminPages.events.searchPlaceholder")}
                        className="pl-9"
                    />
                </div>

                <DataState
                    loading={isLoading}
                    error={isError ? true : undefined}
                    isEmpty={sorted.length === 0}
                    onRetry={() => void refetch()}
                    errorTitle={t("adminPages.events.loadError")}
                    skeleton={
                        <div className="flex flex-col gap-2">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton
                                    key={i}
                                    className="h-12 w-full rounded"
                                />
                            ))}
                        </div>
                    }
                    empty={
                        <Empty>
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <HugeiconsIcon icon={Calendar01Icon} />
                                </EmptyMedia>
                                <EmptyTitle>
                                    {t("adminPages.events.emptyTitle")}
                                </EmptyTitle>
                                <EmptyDescription>
                                    {t("adminPages.events.emptyDescription")}
                                </EmptyDescription>
                            </EmptyHeader>
                            <EmptyContent>
                                <Button onClick={() => setCreateOpen(true)}>
                                    <HugeiconsIcon icon={Add01Icon} />
                                    {t("adminPages.common.create")}
                                </Button>
                            </EmptyContent>
                        </Empty>
                    }
                >
                    <div className="space-y-4">
                        <div className="bg-card rounded-lg border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <SortableHead
                                            direction={getSortDirection(
                                                "title",
                                            )}
                                            onSort={() => handleSort("title")}
                                        >
                                            {t("adminPages.events.titleColumn")}
                                        </SortableHead>
                                        <SortableHead
                                            direction={getSortDirection("date")}
                                            onSort={() => handleSort("date")}
                                        >
                                            {t("adminPages.events.dateColumn")}
                                        </SortableHead>
                                        <SortableHead
                                            direction={getSortDirection(
                                                "address",
                                            )}
                                            onSort={() => handleSort("address")}
                                        >
                                            {t("adminPages.events.placeColumn")}
                                        </SortableHead>
                                        <SortableHead
                                            direction={getSortDirection(
                                                "neighborhood",
                                            )}
                                            onSort={() =>
                                                handleSort("neighborhood")
                                            }
                                        >
                                            {t("incidents.fields.neighborhood")}
                                        </SortableHead>
                                        <TableHead className="text-right">
                                            {t("adminPages.common.actions")}
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pageRows.map((evt) => (
                                        <TableRow key={evt._id}>
                                            <TableCell className="py-2 font-medium">
                                                {evt.title}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground py-2 text-sm whitespace-nowrap tabular-nums">
                                                {new Date(
                                                    evt.date,
                                                ).toLocaleDateString(
                                                    i18n.language,
                                                    {
                                                        day: "numeric",
                                                        month: "short",
                                                        year: "numeric",
                                                    },
                                                )}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground py-2 text-sm">
                                                {evt.address || "—"}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground py-2 text-sm">
                                                {nbhMap[evt.neighborhoodId] ??
                                                    "—"}
                                            </TableCell>
                                            <TableCell className="py-2 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 text-xs"
                                                        onClick={() =>
                                                            setEditTarget(evt)
                                                        }
                                                    >
                                                        <HugeiconsIcon
                                                            icon={Edit01Icon}
                                                        />
                                                        {t(
                                                            "adminPages.common.edit",
                                                        )}
                                                    </Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger
                                                            asChild
                                                        >
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-destructive hover:text-destructive h-8 text-xs"
                                                                disabled={
                                                                    deleteEvent.isPending
                                                                }
                                                            >
                                                                <HugeiconsIcon
                                                                    icon={
                                                                        Delete01Icon
                                                                    }
                                                                />
                                                                {t(
                                                                    "common.delete",
                                                                )}
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>
                                                                    {t(
                                                                        "adminPages.events.deleteConfirmTitle",
                                                                    )}
                                                                </AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    {t(
                                                                        "adminPages.events.deleteConfirmDescription",
                                                                        {
                                                                            title: evt.title,
                                                                        },
                                                                    )}
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>
                                                                    {t(
                                                                        "common.cancel",
                                                                    )}
                                                                </AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    variant="destructive"
                                                                    onClick={() =>
                                                                        handleDelete(
                                                                            evt._id,
                                                                        )
                                                                    }
                                                                >
                                                                    {t(
                                                                        "common.delete",
                                                                    )}
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <DataPagination
                            page={currentPage}
                            pageCount={pageCount}
                            onPageChange={setPage}
                            previousLabel={t("adminPages.common.previousPage")}
                            nextLabel={t("adminPages.common.nextPage")}
                        />
                    </div>
                </DataState>

                <EventDialog
                    open={createOpen}
                    neighborhoods={neighborhoods}
                    onOpenChange={setCreateOpen}
                    onSuccess={() => setCreateOpen(false)}
                />

                {editTarget && (
                    <EventDialog
                        key={editTarget._id}
                        open
                        initial={editTarget}
                        neighborhoods={neighborhoods}
                        onOpenChange={(open) => {
                            if (!open) setEditTarget(null);
                        }}
                        onSuccess={() => setEditTarget(null)}
                    />
                )}
            </div>
        </div>
    );
}

function EventDialog({
    open,
    initial,
    neighborhoods,
    onOpenChange,
    onSuccess,
}: {
    open: boolean;
    initial?: Event;
    neighborhoods: Neighborhood[];
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}) {
    const { t } = useTranslation();
    const toLocalDatetime = (iso?: string) => {
        if (!iso) return "";
        const d = new Date(iso);
        return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
    };

    const [title, setTitle] = useState(initial?.title ?? "");
    const [date, setDate] = useState(toLocalDatetime(initial?.date));
    const [address, setAddress] = useState(initial?.address ?? "");
    const [category, setCategory] = useState(initial?.category ?? "");
    const [description, setDescription] = useState(initial?.description ?? "");
    const [neighborhoodId, setNeighborhoodId] = useState(
        initial?.neighborhoodId ?? "",
    );
    const createEvent = useCreateEvent();
    const updateEvent = useUpdateEvent();

    const isPending = createEvent.isPending || updateEvent.isPending;

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!title.trim() || !date || !category) return;
        const payload = {
            title: title.trim(),
            date: new Date(date).toISOString(),
            category,
            address: address.trim() || undefined,
            description: description.trim() || undefined,
            neighborhoodId: neighborhoodId || undefined,
        };
        if (initial) {
            updateEvent.mutate(
                { id: initial._id, data: payload },
                {
                    onSuccess: () => {
                        toast.success(t("adminPages.events.updated"));
                        onSuccess();
                    },
                    onError: () =>
                        toast.error(t("adminPages.common.saveError")),
                },
            );
        } else {
            createEvent.mutate(payload, {
                onSuccess: () => {
                    toast.success(t("adminPages.events.created"));
                    onSuccess();
                },
                onError: () => toast.error(t("adminPages.common.saveError")),
            });
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {initial
                            ? t("adminPages.events.editTitle")
                            : t("adminPages.events.createTitle")}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="evt-title">
                            {t("adminPages.events.titleLabel")}
                        </Label>
                        <Input
                            id="evt-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={t(
                                "adminPages.events.titlePlaceholder",
                            )}
                            maxLength={255}
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="evt-date">
                                {t("adminPages.events.dateLabel")}
                            </Label>
                            <Input
                                id="evt-date"
                                type="datetime-local"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="evt-address">
                                {t("adminPages.events.placeLabel")}
                            </Label>
                            <Input
                                id="evt-address"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder={t(
                                    "adminPages.events.placePlaceholder",
                                )}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="evt-category">
                            {t("adminPages.events.categoryLabel")}
                        </Label>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger id="evt-category">
                                <SelectValue
                                    placeholder={t(
                                        "adminPages.events.categoryPlaceholder",
                                    )}
                                />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="culture">
                                    {t("adminPages.events.categories.culture")}
                                </SelectItem>
                                <SelectItem value="sport">
                                    {t("adminPages.events.categories.sport")}
                                </SelectItem>
                                <SelectItem value="community">
                                    {t(
                                        "adminPages.events.categories.community",
                                    )}
                                </SelectItem>
                                <SelectItem value="education">
                                    {t(
                                        "adminPages.events.categories.education",
                                    )}
                                </SelectItem>
                                <SelectItem value="other">
                                    {t("adminPages.events.categories.other")}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {neighborhoods.length > 0 && (
                        <div className="space-y-2">
                            <Label>{t("incidents.fields.neighborhood")}</Label>
                            <Select
                                value={neighborhoodId}
                                onValueChange={setNeighborhoodId}
                            >
                                <SelectTrigger>
                                    <SelectValue
                                        placeholder={t(
                                            "adminPages.common.chooseNeighborhood",
                                        )}
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    {neighborhoods.map((n) => (
                                        <SelectItem key={n._id} value={n._id}>
                                            {n.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="evt-desc">
                            {t("incidents.fields.description")}
                        </Label>
                        <Textarea
                            id="evt-desc"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            {t("common.cancel")}
                        </Button>
                        <Button
                            type="submit"
                            disabled={
                                isPending || !title.trim() || !date || !category
                            }
                        >
                            {isPending && <Spinner className="mr-2" />}
                            {initial
                                ? t("common.save")
                                : t("adminPages.common.create")}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
