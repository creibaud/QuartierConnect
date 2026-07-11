import type { Event } from "@workspace/shared/lib/types";

const byDateAsc = (a: Event, b: Event) =>
    new Date(a.date).getTime() - new Date(b.date).getTime();

export function eventsByDateAsc(events: Event[]): Event[] {
    return [...events].sort(byDateAsc);
}

export function upcomingEvents(
    events: Event[],
    from: Date = new Date(),
): Event[] {
    return events.filter((e) => new Date(e.date) >= from).sort(byDateAsc);
}

export function eventsOnDate(events: Event[], date: Date): Event[] {
    return events.filter((e) => {
        const d = new Date(e.date);
        return (
            d.getFullYear() === date.getFullYear() &&
            d.getMonth() === date.getMonth() &&
            d.getDate() === date.getDate()
        );
    });
}
