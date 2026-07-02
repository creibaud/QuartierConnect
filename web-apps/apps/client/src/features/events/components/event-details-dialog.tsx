import { useTranslation } from "react-i18next";
import { formatAddress } from "@workspace/shared/lib/address";
import type { Event } from "@workspace/shared/lib/types";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@workspace/ui/components/dialog";
import { formatEventDateTime } from "../lib/event-date";
import { EventParticipation } from "./event-participation";

export function EventDetailsDialog({
    event,
    open,
    onOpenChange,
}: {
    event: Event;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const { i18n } = useTranslation();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{event.title}</DialogTitle>
                    <DialogDescription>
                        {formatEventDateTime(
                            new Date(event.date),
                            i18n.language,
                            {
                                weekday: "long",
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                            },
                        )}
                    </DialogDescription>
                </DialogHeader>
                {event.address && (
                    <p className="text-muted-foreground text-sm">
                        {formatAddress(event.address)}
                    </p>
                )}
                {event.description && (
                    <p className="text-sm">{event.description}</p>
                )}
                <EventParticipation event={event} />
            </DialogContent>
        </Dialog>
    );
}
