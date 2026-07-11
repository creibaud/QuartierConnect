import { useTranslation } from "react-i18next";
import type { Event } from "@workspace/shared/lib/types";
import {
    Card,
    CardContent,
} from "@workspace/ui/components/card";
import { Calendar } from "@workspace/ui/components/calendar";
import { calendarLocaleFor } from "@workspace/ui/lib/calendar-locales";
import { eventsOnDate } from "../lib/events-filter";
import { EventCard } from "./event-card";

export function EventsCalendarView({
    events,
    upcoming,
    selectedDate,
    onSelectDate,
}: {
    events: Event[];
    upcoming: Event[];
    selectedDate: Date | undefined;
    onSelectDate: (date: Date | undefined) => void;
}) {
    const { t, i18n } = useTranslation();
    const eventDates = events.map((e) => new Date(e.date));
    const eventsOnSelected = selectedDate
        ? eventsOnDate(events, selectedDate)
        : [];
    const shown = selectedDate ? eventsOnSelected : upcoming.slice(0, 6);

    return (
        <div className="grid gap-6 lg:grid-cols-[auto_1fr] lg:items-start">
            <Card className="w-fit">
                <CardContent className="flex justify-center p-2 sm:p-3">
                    <Calendar
                        mode="single"
                        locale={calendarLocaleFor(i18n.language)}
                        selected={selectedDate}
                        onSelect={onSelectDate}
                        modifiers={{ hasEvent: eventDates }}
                        modifiersClassNames={{
                            hasEvent:
                                "font-bold underline decoration-dotted underline-offset-4",
                        }}
                    />
                </CardContent>
            </Card>

            <div className="flex flex-col gap-3">
                <p className="text-sm font-medium">
                    {selectedDate
                        ? selectedDate.toLocaleDateString(i18n.language, {
                              weekday: "long",
                              day: "numeric",
                              month: "long",
                          })
                        : t("pages.events.upcoming")}
                </p>
                {(selectedDate ? eventsOnSelected : upcoming).length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                        {selectedDate
                            ? t("pages.events.noneThisDay")
                            : t("pages.events.emptyDescription")}
                    </p>
                ) : (
                    shown.map((evt) => <EventCard key={evt._id} event={evt} />)
                )}
            </div>
        </div>
    );
}
