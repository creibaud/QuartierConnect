import { Calendar01Icon } from "@hugeicons/core-free-icons";
import { useTranslation } from "react-i18next";
import { useEvents } from "@workspace/shared/lib/hooks/events.hooks";
import { Badge } from "@workspace/ui/components/badge";
import { selectUpcomingEvents } from "../lib/kpis";
import { formatEventDay, formatEventMonth } from "../lib/format";
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
                <EmptyBlock
                    icon={Calendar01Icon}
                    title={t("pages.dashboard.noUpcomingEvents")}
                    subtitle={t("pages.dashboard.noUpcomingEventsHint")}
                />
            ) : (
                <ul className="space-y-2.5">
                    {upcoming.map((e) => (
                        <li key={e._id} className="flex items-center gap-3">
                            <div className="bg-primary/10 text-primary flex size-11 shrink-0 flex-col items-center justify-center rounded-lg">
                                <span className="text-sm font-bold leading-none">{formatEventDay(e.date)}</span>
                                <span className="text-[10px] font-medium uppercase leading-none mt-0.5">{formatEventMonth(e.date)}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">{e.title}</p>
                                <div className="mt-0.5 flex items-center gap-2">
                                    <Badge variant="secondary" className="text-[10px]">{e.category}</Badge>
                                    {e.address ? <span className="text-muted-foreground truncate text-xs">{e.address}</span> : null}
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </FeedCard>
    );
}
