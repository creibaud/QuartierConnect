import type { Event } from "@workspace/shared/lib/types";
import { eventsByDateAsc } from "../lib/events-filter";
import { EventCard } from "./event-card";

export function EventsListView({ events }: { events: Event[] }) {
    return (
        <div className="grid gap-4 sm:grid-cols-2">
            {eventsByDateAsc(events).map((evt) => (
                <EventCard key={evt._id} event={evt} />
            ))}
        </div>
    );
}
