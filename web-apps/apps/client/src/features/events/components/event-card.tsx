import { useState } from "react";
import { useTranslation } from "react-i18next";
import { formatAddress } from "@workspace/shared/lib/address";
import type { Event } from "@workspace/shared/lib/types";
import { Badge } from "@workspace/ui/components/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components/card";
import { formatEventDateTime } from "../lib/event-date";
import { EventDetailsDialog } from "./event-details-dialog";
import { EventParticipation } from "./event-participation";

export function EventCard({ event }: { event: Event }) {
    const { t, i18n } = useTranslation();
    const [detailsOpen, setDetailsOpen] = useState(false);
    const date = new Date(event.date);
    const isPast = date < new Date();

    return (
        <>
            <Card
                role="button"
                tabIndex={0}
                aria-label={t("pages.events.viewDetails")}
                className={`hover:ring-primary/40 cursor-pointer transition-shadow ${isPast ? "opacity-60" : ""}`}
                onClick={() => setDetailsOpen(true)}
                onKeyDown={(keyEvent) => {
                    if (keyEvent.target !== keyEvent.currentTarget) return;
                    if (keyEvent.key === "Enter" || keyEvent.key === " ") {
                        keyEvent.preventDefault();
                        setDetailsOpen(true);
                    }
                }}
            >
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-sm font-medium">
                            {event.title}
                        </CardTitle>
                        <div className="flex shrink-0 items-center gap-2">
                            {isPast && (
                                <Badge variant="outline" className="text-xs">
                                    {t("pages.events.past")}
                                </Badge>
                            )}
                            <span className="text-muted-foreground text-xs whitespace-nowrap">
                                {formatEventDateTime(date, i18n.language, {
                                    day: "numeric",
                                    month: "short",
                                    ...(date.getFullYear() !==
                                    new Date().getFullYear()
                                        ? { year: "numeric" as const }
                                        : {}),
                                })}
                            </span>
                        </div>
                    </div>
                    {event.address && (
                        <CardDescription>
                            {formatAddress(event.address)}
                        </CardDescription>
                    )}
                </CardHeader>
                {event.description && (
                    <CardContent className="pt-0">
                        <p className="text-muted-foreground line-clamp-2 text-sm">
                            {event.description}
                        </p>
                    </CardContent>
                )}
                <CardFooter className="pt-0">
                    <div className="w-full">
                        <EventParticipation event={event} />
                    </div>
                </CardFooter>
            </Card>
            <EventDetailsDialog
                event={event}
                open={detailsOpen}
                onOpenChange={setDetailsOpen}
            />
        </>
    );
}
