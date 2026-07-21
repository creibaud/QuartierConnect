import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSwipeable } from "react-swipeable";
import { Cancel01Icon, FavouriteIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { formatAddress } from "@workspace/shared/lib/address";
import { useEventInterest } from "@workspace/shared/lib/hooks/events.hooks";
import type { Event } from "@workspace/shared/lib/types";
import { Button } from "@workspace/ui/components/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components/card";
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@workspace/ui/components/empty";
import { toast } from "sonner";
import { formatEventDateTime } from "../lib/event-date";
import { ParticipantCount } from "./event-participation";

export function EventsSwipeView({ events }: { events: Event[] }) {
    const { t, i18n } = useTranslation();
    const [index, setIndex] = useState(0);
    const [swipeDirection, setSwipeDirection] = useState<
        "left" | "right" | null
    >(null);
    const interest = useEventInterest();

    const current = events[index];

    function advance(direction: "left" | "right") {
        setSwipeDirection(direction);
        setTimeout(() => {
            setSwipeDirection(null);
            setIndex((i) => i + 1);
        }, 300);
    }

    function markInterested() {
        if (!current) return;
        interest.mutate(
            { eventId: current._id, source: "swipe" },
            {
                onSuccess: () => toast.success(t("pages.events.interested")),
                onError: () => toast.error(t("pages.events.participateError")),
            },
        );
        advance("right");
    }

    function skip() {
        if (!current) return;
        advance("left");
    }

    const handlers = useSwipeable({
        onSwipedRight: markInterested,
        onSwipedLeft: skip,
        trackMouse: true,
        preventScrollOnSwipe: true,
    });

    if (events.length === 0) {
        return (
            <p className="text-muted-foreground py-8 text-center text-sm">
                {t("pages.events.noneToShow")}
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
                    <EmptyTitle>{t("pages.events.allSeenTitle")}</EmptyTitle>
                    <EmptyDescription>
                        {t("pages.events.allSeenDescription")}
                    </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIndex(0)}
                    >
                        {t("pages.events.restart")}
                    </Button>
                </EmptyContent>
            </Empty>
        );
    }

    return (
        <div className="space-y-4">
            <p className="text-muted-foreground text-center text-xs">
                {t("pages.events.swipeHint", {
                    current: index + 1,
                    total: events.length,
                })}
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
                                {formatAddress(current.address)}
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
                            {formatEventDateTime(
                                new Date(current.date),
                                i18n.language,
                                {
                                    weekday: "long",
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                },
                            )}
                        </p>
                        <ParticipantCount
                            count={current.interestedUserIds?.length ?? 0}
                        />
                    </CardContent>
                </Card>
            </div>
            <div className="flex justify-center gap-6">
                <Button
                    variant="outline"
                    size="icon"
                    aria-label={t("pages.events.skip")}
                    className="border-destructive text-destructive hover:bg-destructive/10 size-14 rounded-full border-2"
                    onClick={skip}
                >
                    <HugeiconsIcon icon={Cancel01Icon} />
                </Button>
                <Button
                    size="icon"
                    aria-label={t("pages.events.imInterested")}
                    className="size-14 rounded-full"
                    onClick={markInterested}
                >
                    <HugeiconsIcon icon={FavouriteIcon} />
                </Button>
            </div>
        </div>
    );
}
