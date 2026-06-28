import { Calendar01Icon } from "@hugeicons/core-free-icons";
import { useTranslation } from "react-i18next";
import { useEvents } from "@workspace/shared/lib/hooks/events.hooks";
import { selectUpcomingEvents } from "../lib/kpis";
import { formatEventDate } from "../lib/format";
import { EmptyBlock, FeedCard, Rows } from "./feed-card";

export function UpcomingEventsCard({ now }: { now: number }) {
    const { t } = useTranslation();
    const { data: events, isLoading } = useEvents();
    const upcoming = selectUpcomingEvents(events ?? [], now);

    return (
        <FeedCard title={t("pages.dashboard.upcomingEvents")} to="/events" icon={Calendar01Icon}>
            {isLoading ? (
                <Rows count={3} />
            ) : upcoming.length === 0 ? (
                <EmptyBlock icon={Calendar01Icon} text={t("pages.dashboard.noUpcomingEvents")} />
            ) : (
                <ul className="space-y-2">
                    {upcoming.map((e) => (
                        <li key={e._id} className="flex items-center justify-between gap-3 text-sm">
                            <span className="truncate font-medium">{e.title}</span>
                            <span className="text-muted-foreground shrink-0 text-xs">
                                {formatEventDate(e.date)}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </FeedCard>
    );
}
