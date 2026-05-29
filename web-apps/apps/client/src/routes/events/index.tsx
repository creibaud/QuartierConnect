import { useState } from "react";
import { useSwipeable } from "react-swipeable";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { apiPost, ensureAuthenticated } from "@workspace/shared/lib/api";
import { centroidOf, pointToLatLng } from "@workspace/shared/lib/geo";
import {
    useCreateEvent,
    useEvents,
} from "@workspace/shared/lib/hooks/events.hooks";
import { useNeighborhoods } from "@workspace/shared/lib/hooks/neighborhoods.hooks";
import type { Event } from "@workspace/shared/lib/types";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Calendar } from "@workspace/ui/components/calendar";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components/card";
import {
    Map,
    Marker,
    MarkerCluster,
    NeighborhoodPolygon,
} from "@workspace/ui/components/map";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Textarea } from "@workspace/ui/components/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/events/")({
    beforeLoad: async () => {
        const user = await ensureAuthenticated();
        if (!user) throw redirect({ to: "/login" });
    },
    component: EventsPage,
});

type ViewMode = "list" | "calendar" | "swipe" | "map";

function EventsPage() {
    const [createOpen, setCreateOpen] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>("calendar");
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(
        undefined,
    );

    const { data, isLoading, isError } = useEvents();
    const events = data ?? [];

    const eventDates = events.map((e) => new Date(e.date));

    const eventsOnSelected = selectedDate
        ? events.filter((e) => {
              const d = new Date(e.date);
              return (
                  d.getFullYear() === selectedDate.getFullYear() &&
                  d.getMonth() === selectedDate.getMonth() &&
                  d.getDate() === selectedDate.getDate()
              );
          })
        : [];

    const upcoming = [...events]
        .filter((e) => new Date(e.date) >= new Date())
        .sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        );

    return (
        <div className="min-h-screen bg-zinc-50 p-6 dark:bg-zinc-950">
            <div className="mx-auto max-w-2xl space-y-6">
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
                    <div className="flex items-center gap-2">
                        <div className="flex overflow-hidden rounded-md border text-xs">
                            <button
                                type="button"
                                onClick={() => setViewMode("calendar")}
                                className={`px-3 py-1.5 transition-colors ${viewMode === "calendar" ? "bg-foreground text-background" : "bg-background hover:bg-muted"}`}
                            >
                                Calendrier
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode("list")}
                                className={`border-l px-3 py-1.5 transition-colors ${viewMode === "list" ? "bg-foreground text-background" : "bg-background hover:bg-muted"}`}
                            >
                                Liste
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode("swipe")}
                                className={`border-l px-3 py-1.5 transition-colors ${viewMode === "swipe" ? "bg-foreground text-background" : "bg-background hover:bg-muted"}`}
                            >
                                Swipe
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode("map")}
                                className={`border-l px-3 py-1.5 transition-colors ${viewMode === "map" ? "bg-foreground text-background" : "bg-background hover:bg-muted"}`}
                            >
                                Carte
                            </button>
                        </div>
                        <Button size="sm" onClick={() => setCreateOpen(true)}>
                            Créer
                        </Button>
                    </div>
                </header>

                {isLoading ? (
                    <Skeleton className="h-64 w-full rounded-lg" />
                ) : isError ? (
                    <p className="text-destructive text-sm">
                        Erreur de chargement. Réessayez.
                    </p>
                ) : viewMode === "calendar" ? (
                    <div className="space-y-4">
                        <Card>
                            <CardContent className="flex justify-center pt-4">
                                <Calendar
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={setSelectedDate}
                                    modifiers={{ hasEvent: eventDates }}
                                    modifiersClassNames={{
                                        hasEvent:
                                            "font-bold underline decoration-dotted underline-offset-4",
                                    }}
                                />
                            </CardContent>
                        </Card>

                        {selectedDate && (
                            <div className="space-y-2">
                                <p className="text-sm font-medium">
                                    {selectedDate.toLocaleDateString("fr-FR", {
                                        weekday: "long",
                                        day: "numeric",
                                        month: "long",
                                    })}
                                </p>
                                {eventsOnSelected.length === 0 ? (
                                    <p className="text-muted-foreground text-sm">
                                        Aucun événement ce jour.
                                    </p>
                                ) : (
                                    eventsOnSelected.map((evt) => (
                                        <EventCard key={evt._id} event={evt} />
                                    ))
                                )}
                            </div>
                        )}

                        {!selectedDate && upcoming.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-muted-foreground text-sm font-medium">
                                    Prochains événements
                                </p>
                                {upcoming.slice(0, 3).map((evt) => (
                                    <EventCard key={evt._id} event={evt} />
                                ))}
                            </div>
                        )}
                    </div>
                ) : viewMode === "swipe" ? (
                    <SwipeView events={upcoming} />
                ) : viewMode === "map" ? (
                    <MapView events={events} />
                ) : events.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                        Aucun événement prévu pour le moment.
                    </p>
                ) : (
                    <div className="space-y-3">
                        {[...events]
                            .sort(
                                (a, b) =>
                                    new Date(a.date).getTime() -
                                    new Date(b.date).getTime(),
                            )
                            .map((evt) => (
                                <EventCard key={evt._id} event={evt} />
                            ))}
                    </div>
                )}

                <CreateEventDialog
                    open={createOpen}
                    onOpenChange={setCreateOpen}
                    onSuccess={() => setCreateOpen(false)}
                />
            </div>
        </div>
    );
}

function SwipeView({ events }: { events: Event[] }) {
    const [index, setIndex] = useState(0);
    const [swipeDirection, setSwipeDirection] = useState<
        "left" | "right" | null
    >(null);
    const queryClient = useQueryClient();

    const recordInterest = useMutation({
        mutationFn: ({
            eventId,
            interested,
        }: {
            eventId: string;
            interested: boolean;
        }) => apiPost("/social/interest", { eventId, interested }),
        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: ["recommendations"],
            });
        },
    });

    const current = events[index];

    const handlers = useSwipeable({
        onSwipedRight: () => {
            if (!current) return;
            setSwipeDirection("right");
            recordInterest.mutate({ eventId: current._id, interested: true });
            toast.success("Intéressé !");
            setTimeout(() => {
                setSwipeDirection(null);
                setIndex((i) => i + 1);
            }, 300);
        },
        onSwipedLeft: () => {
            if (!current) return;
            setSwipeDirection("left");
            recordInterest.mutate({ eventId: current._id, interested: false });
            setTimeout(() => {
                setSwipeDirection(null);
                setIndex((i) => i + 1);
            }, 300);
        },
        trackMouse: true,
        preventScrollOnSwipe: true,
    });

    if (events.length === 0) {
        return (
            <p className="text-muted-foreground py-8 text-center text-sm">
                Aucun événement à afficher.
            </p>
        );
    }

    if (index >= events.length) {
        return (
            <div className="space-y-3 py-12 text-center">
                <p className="text-2xl">🎉</p>
                <p className="text-sm font-medium">
                    Vous avez vu tous les événements !
                </p>
                <Button variant="outline" size="sm" onClick={() => setIndex(0)}>
                    Recommencer
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <p className="text-muted-foreground text-center text-xs">
                {index + 1} / {events.length} — Glissez à droite pour marquer
                votre intérêt
            </p>
            <div
                {...handlers}
                className={`cursor-grab transition-transform duration-300 select-none active:cursor-grabbing ${
                    swipeDirection === "right"
                        ? "translate-x-full opacity-0"
                        : swipeDirection === "left"
                          ? "-translate-x-full opacity-0"
                          : ""
                }`}
            >
                <Card className="border-2">
                    <CardHeader>
                        <CardTitle className="text-lg">
                            {current.title}
                        </CardTitle>
                        {current.location && (
                            <CardDescription>
                                {current.location}
                            </CardDescription>
                        )}
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {current.description && (
                            <p className="text-muted-foreground text-sm">
                                {current.description}
                            </p>
                        )}
                        <p className="text-sm font-medium">
                            {new Date(current.date).toLocaleDateString(
                                "fr-FR",
                                {
                                    weekday: "long",
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                },
                            )}
                        </p>
                    </CardContent>
                </Card>
            </div>
            <div className="flex justify-center gap-6">
                <Button
                    variant="outline"
                    size="lg"
                    className="border-destructive text-destructive hover:bg-destructive/10 h-14 w-14 rounded-full border-2 text-xl"
                    onClick={() => {
                        setSwipeDirection("left");
                        recordInterest.mutate({
                            eventId: current._id,
                            interested: false,
                        });
                        setTimeout(() => {
                            setSwipeDirection(null);
                            setIndex((i) => i + 1);
                        }, 300);
                    }}
                >
                    ✕
                </Button>
                <Button
                    size="lg"
                    className="h-14 w-14 rounded-full border-2 text-xl"
                    onClick={() => {
                        setSwipeDirection("right");
                        recordInterest.mutate({
                            eventId: current._id,
                            interested: true,
                        });
                        toast.success("Intéressé !");
                        setTimeout(() => {
                            setSwipeDirection(null);
                            setIndex((i) => i + 1);
                        }, 300);
                    }}
                >
                    ♥
                </Button>
            </div>
        </div>
    );
}

function EventCard({ event }: { event: Event }) {
    const date = new Date(event.date);
    const isPast = date < new Date();

    return (
        <Card className={isPast ? "opacity-60" : ""}>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-sm font-medium">
                        {event.title}
                    </CardTitle>
                    <div className="flex shrink-0 items-center gap-2">
                        {isPast && (
                            <Badge variant="outline" className="text-xs">
                                Passé
                            </Badge>
                        )}
                        <span className="text-muted-foreground text-xs whitespace-nowrap">
                            {date.toLocaleDateString("fr-FR", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                            })}
                        </span>
                    </div>
                </div>
                {event.location && (
                    <CardDescription>{event.location}</CardDescription>
                )}
            </CardHeader>
            {event.description && (
                <CardContent className="pt-0">
                    <p className="text-muted-foreground line-clamp-2 text-sm">
                        {event.description}
                    </p>
                </CardContent>
            )}
        </Card>
    );
}

function CreateEventDialog({
    open,
    onOpenChange,
    onSuccess,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [date, setDate] = useState("");
    const [location, setLocation] = useState("");
    const [category, setCategory] = useState("other");
    const createEvent = useCreateEvent();

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!title.trim() || !date) return;
        createEvent.mutate(
            {
                title: title.trim(),
                description: description.trim() || undefined,
                date,
                category,
                location: location.trim() || undefined,
            },
            {
                onSuccess: () => {
                    toast.success("Événement créé");
                    setTitle("");
                    setDescription("");
                    setDate("");
                    setLocation("");
                    setCategory("other");
                    onSuccess();
                },
                onError: () => toast.error("Impossible de créer l'événement"),
            },
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Créer un événement</DialogTitle>
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
                                createEvent.isPending || !title.trim() || !date
                            }
                        >
                            {createEvent.isPending ? "Création…" : "Créer"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function MapView({ events }: { events: Event[] }) {
    const { data: neighborhoods } = useNeighborhoods();
    const firstNeighborhood = neighborhoods?.find((n) => n.geometry);
    const eventsWithCoords = events.filter((e) => e.location);

    if (!firstNeighborhood?.geometry) {
        return (
            <p className="text-muted-foreground text-sm">
                Aucun quartier cartographié pour le moment.
            </p>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">
                    Événements à proximité
                </CardTitle>
                <CardDescription>
                    {eventsWithCoords.length} événement(s) localisé(s)
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Map
                    center={centroidOf(firstNeighborhood.geometry)}
                    zoom={14}
                    className="h-[480px] w-full"
                >
                    {neighborhoods?.map((n) =>
                        n.geometry ? (
                            <NeighborhoodPolygon
                                key={n._id}
                                geometry={n.geometry}
                                label={n.name}
                            />
                        ) : null,
                    )}
                    <MarkerCluster>
                        {eventsWithCoords.map((evt) => (
                            <Marker
                                key={evt._id}
                                variant="event"
                                position={pointToLatLng(evt.location!)}
                                popup={
                                    <div className="space-y-1">
                                        <p className="font-medium">
                                            {evt.title}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(
                                                evt.date,
                                            ).toLocaleString("fr-FR")}
                                        </p>
                                    </div>
                                }
                            />
                        ))}
                    </MarkerCluster>
                </Map>
            </CardContent>
        </Card>
    );
}
