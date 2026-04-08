import { useState } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ensureAuthenticated } from "@workspace/shared/lib/api";
import {
    useCreateEvent,
    useDeleteEvent,
    useEvents,
    useUpdateEvent,
} from "@workspace/shared/lib/hooks/events.hooks";
import { useNeighborhoods } from "@workspace/shared/lib/hooks/neighborhoods.hooks";
import type { Event, Neighborhood } from "@workspace/shared/lib/types";
import { Button } from "@workspace/ui/components/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@workspace/ui/components/select";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@workspace/ui/components/table";
import { Textarea } from "@workspace/ui/components/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/events/")({
    beforeLoad: async () => {
        const user = await ensureAuthenticated();
        if (!user)
            throw redirect({ to: "/login", search: { forbidden: false } });
        if (user.role !== "admin")
            throw redirect({ to: "/login", search: { forbidden: true } });
    },
    component: AdminEventsPage,
});

function AdminEventsPage() {
    const [createOpen, setCreateOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Event | null>(null);

    const { data: eventsData, isLoading, isError } = useEvents(100);
    const { data: neighborhoodsData } = useNeighborhoods(100);
    const events = eventsData ?? [];
    const neighborhoods = neighborhoodsData ?? [];
    const deleteEvent = useDeleteEvent();

    const nbhMap = Object.fromEntries(
        neighborhoods.map((n) => [n._id, n.name]),
    );

    function handleDelete(id: string) {
        deleteEvent.mutate(id, {
            onSuccess: () => toast.success("Événement supprimé"),
            onError: () => toast.error("Impossible de supprimer"),
        });
    }

    return (
        <div className="min-h-screen bg-zinc-50 p-6 dark:bg-zinc-950">
            <div className="mx-auto max-w-5xl space-y-6">
                <header className="flex items-center justify-between">
                    <div className="space-y-1">
                        <h1 className="text-xl font-semibold">Événements</h1>
                        <Link
                            to="/dashboard"
                            className="text-muted-foreground text-sm hover:underline"
                        >
                            ← Tableau de bord
                        </Link>
                    </div>
                    <Button size="sm" onClick={() => setCreateOpen(true)}>
                        Ajouter
                    </Button>
                </header>

                {isLoading ? (
                    <div className="space-y-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full rounded" />
                        ))}
                    </div>
                ) : isError ? (
                    <p className="text-destructive text-sm">
                        Erreur de chargement.
                    </p>
                ) : events.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                        Aucun événement.
                    </p>
                ) : (
                    <div className="rounded-lg border bg-white dark:bg-zinc-900">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Titre</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Lieu</TableHead>
                                    <TableHead>Quartier</TableHead>
                                    <TableHead className="text-right">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {events.map((evt) => (
                                    <TableRow key={evt._id}>
                                        <TableCell className="font-medium">
                                            {evt.title}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                                            {new Date(
                                                evt.date,
                                            ).toLocaleDateString("fr-FR", {
                                                day: "numeric",
                                                month: "short",
                                                year: "numeric",
                                            })}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {evt.location || "—"}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {nbhMap[evt.neighborhoodId] ?? "—"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 text-xs"
                                                    onClick={() =>
                                                        setEditTarget(evt)
                                                    }
                                                >
                                                    Modifier
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    className="h-8 text-xs"
                                                    disabled={
                                                        deleteEvent.isPending
                                                    }
                                                    onClick={() =>
                                                        handleDelete(evt._id)
                                                    }
                                                >
                                                    {deleteEvent.isPending
                                                        ? "…"
                                                        : "Supprimer"}
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}

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
    const toLocalDatetime = (iso?: string) =>
        iso ? new Date(iso).toISOString().slice(0, 16) : "";

    const [title, setTitle] = useState(initial?.title ?? "");
    const [date, setDate] = useState(toLocalDatetime(initial?.date));
    const [location, setLocation] = useState(initial?.location ?? "");
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
            date,
            category,
            location: location.trim() || undefined,
            description: description.trim() || undefined,
            neighborhoodId: neighborhoodId || undefined,
        };
        if (initial) {
            updateEvent.mutate(
                { id: initial._id, data: payload },
                {
                    onSuccess: () => {
                        toast.success("Événement modifié");
                        onSuccess();
                    },
                    onError: () =>
                        toast.error("Erreur lors de l'enregistrement"),
                },
            );
        } else {
            createEvent.mutate(payload, {
                onSuccess: () => {
                    toast.success("Événement créé");
                    onSuccess();
                },
                onError: () => toast.error("Erreur lors de l'enregistrement"),
            });
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {initial
                            ? "Modifier l'événement"
                            : "Créer un événement"}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="evt-title">Titre *</Label>
                        <Input
                            id="evt-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Ex : Fête de quartier"
                            maxLength={255}
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="evt-date">Date *</Label>
                            <Input
                                id="evt-date"
                                type="datetime-local"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="evt-location">Lieu</Label>
                            <Input
                                id="evt-location"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder="Ex : Place du marché"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="evt-category">Catégorie *</Label>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger id="evt-category">
                                <SelectValue placeholder="Choisir une catégorie" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="culture">Culture</SelectItem>
                                <SelectItem value="sport">Sport</SelectItem>
                                <SelectItem value="community">
                                    Communauté
                                </SelectItem>
                                <SelectItem value="education">
                                    Éducation
                                </SelectItem>
                                <SelectItem value="other">Autre</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {neighborhoods.length > 0 && (
                        <div className="space-y-2">
                            <Label>Quartier</Label>
                            <Select
                                value={neighborhoodId}
                                onValueChange={setNeighborhoodId}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Choisir un quartier" />
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
                        <Label htmlFor="evt-desc">Description</Label>
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
                            Annuler
                        </Button>
                        <Button
                            type="submit"
                            disabled={
                                isPending || !title.trim() || !date || !category
                            }
                        >
                            {isPending
                                ? "…"
                                : initial
                                  ? "Enregistrer"
                                  : "Créer"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
