import { useState } from "react";
import {
    Add01Icon,
    Calendar01Icon,
    Cancel01Icon,
    FavouriteIcon,
    GridViewIcon,
    ListViewIcon,
    Location01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useSwipeable } from "react-swipeable";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { apiPost } from "@workspace/shared/lib/api";
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
import { DataState } from "@workspace/ui/components/data-state";
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@workspace/ui/components/empty";
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
import { PageHeader } from "@workspace/ui/components/page-header";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Textarea } from "@workspace/ui/components/textarea";
import {
    ToggleGroup,
    ToggleGroupItem,
} from "@workspace/ui/components/toggle-group";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/events/")({
    component: EventsPage,
});

type ViewMode = "list" | "calendar" | "swipe" | "map";

function EventsPage() {
    const [createOpen, setCreateOpen] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>("calendar");
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(
        undefined,
    );

    const { data, isLoading, isError, refetch } = useEvents();
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
        <div className="p-6 md:p-8">
            <div className="mx-auto flex max-w-5xl flex-col gap-6">
                <PageHeader
                    title="Événements"
                    description="Les rendez-vous et animations de votre quartier."
                    actions={
                        <div className="flex items-center gap-2">
                            <ToggleGroup
                                type="single"
                                variant="outline"
                                size="sm"
                                value={viewMode}
                                onValueChange={(value) => {
                                    if (value) setViewMode(value as ViewMode);
                                }}
                            >
                                <ToggleGroupItem
                                    value="calendar"
                                    aria-label="Vue calendrier"
                                >
                                    <HugeiconsIcon icon={Calendar01Icon} />
                                </ToggleGroupItem>
                                <ToggleGroupItem
                                    value="list"
                                    aria-label="Vue liste"
                                >
                                    <HugeiconsIcon icon={ListViewIcon} />
                                </ToggleGroupItem>
                                <ToggleGroupItem
                                    value="swipe"
                                    aria-label="Vue cartes"
                                >
                                    <HugeiconsIcon icon={GridViewIcon} />
                                </ToggleGroupItem>
                                <ToggleGroupItem
                                    value="map"
                                    aria-label="Vue carte"
                                >
                                    <HugeiconsIcon icon={Location01Icon} />
                                </ToggleGroupItem>
                            </ToggleGroup>
                            <Button onClick={() => setCreateOpen(true)}>
                                <HugeiconsIcon icon={Add01Icon} />
                                Créer
                            </Button>
                        </div>
                    }
                />

                <DataState
                    loading={isLoading}
                    error={isError ? true : undefined}
                    isEmpty={
                        viewMode === "list" && events.length === 0
                    }
                    onRetry={() => void refetch()}
                    skeleton={
                        <Skeleton className="h-72 w-full rounded-xl" />
                    }
                    empty={
                        <Empty className="border">
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <HugeiconsIcon icon={Calendar01Icon} />
                                </EmptyMedia>
                                <EmptyTitle>
                                    Aucun événement prévu
                                </EmptyTitle>
                                <EmptyDescription>
                                    Organisez le premier rendez-vous de votre
                                    quartier.
                                </EmptyDescription>
                            </EmptyHeader>
                            <EmptyContent>
                                <Button onClick={() => setCreateOpen(true)}>
                                    <HugeiconsIcon icon={Add01Icon} />
                                    Créer un événement
                                </Button>
                            </EmptyContent>
                        </Empty>
                    }
                >
                    {viewMode === "calendar" ? (
                        <div className="flex flex-col gap-4">
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
                                <div className="flex flex-col gap-3">
                                    <p className="text-sm font-medium">
                                        {selectedDate.toLocaleDateString(
                                            "fr-FR",
                                            {
                                                weekday: "long",
                                                day: "numeric",
                                                month: "long",
                                            },
                                        )}
                                    </p>
                                    {eventsOnSelected.length === 0 ? (
                                        <p className="text-muted-foreground text-sm">
                                            Aucun événement ce jour.
                                        </p>
                                    ) : (
                                        eventsOnSelected.map((evt) => (
                                            <EventCard
                                                key={evt._id}
                                                event={evt}
                                            />
                                        ))
                                    )}
                                </div>
                            )}

                            {!selectedDate && upcoming.length > 0 && (
                                <div className="flex flex-col gap-3">
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
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2">
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
                </DataState>

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
            <Empty className="border">
                <EmptyHeader>
                    <EmptyMedia variant="icon">
                        <HugeiconsIcon icon={FavouriteIcon} />
                    </EmptyMedia>
                    <EmptyTitle>Vous avez tout vu !</EmptyTitle>
                    <EmptyDescription>
                        Vous avez parcouru tous les événements à venir.
                    </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIndex(0)}
                    >
                        Recommencer
                    </Button>
                </EmptyContent>
            </Empty>
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
                        {current.address && (
                            <CardDescription>
                                {current.address}
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
                    size="icon"
                    aria-label="Passer"
                    className="border-destructive text-destructive hover:bg-destructive/10 size-14 rounded-full border-2"
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
                    <HugeiconsIcon icon={Cancel01Icon} />
                </Button>
                <Button
                    size="icon"
                    aria-label="Je suis intéressé"
                    className="size-14 rounded-full"
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
                    <HugeiconsIcon icon={FavouriteIcon} />
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
                {event.address && (
                    <CardDescription>{event.address}</CardDescription>
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
    const [address, setAddress] = useState("");
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
                address: address.trim() || undefined,
            },
            {
                onSuccess: () => {
                    toast.success("Événement créé");
                    setTitle("");
                    setDescription("");
                    setDate("");
                    setAddress("");
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
                            <Label htmlFor="evt-address">Lieu</Label>
                            <Input
                                id="evt-address"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
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
