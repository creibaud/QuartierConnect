import { Calendar01Icon } from "@hugeicons/core-free-icons";
import { useTranslation } from "react-i18next";
import { useEvents } from "@workspace/shared/lib/hooks/events.hooks";
import { Badge } from "@workspace/ui/components/badge";
import { Item, ItemGroup, ItemContent, ItemTitle, ItemDescription, ItemActions } from "@workspace/ui/components/item";
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
                <ItemGroup>
                    {upcoming.map((e) => (
                        <Item key={e._id} variant="outline" size="sm">
                            <div className="bg-primary/10 text-primary flex size-11 shrink-0 flex-col items-center justify-center gap-0.5 rounded-md leading-none">
                                <span className="text-[15px] font-bold">{formatEventDay(e.date)}</span>
                                <span className="text-[10px] font-medium uppercase">{formatEventMonth(e.date)}</span>
                            </div>
                            <ItemContent>
                                <ItemTitle>{e.title}</ItemTitle>
                                {e.address ? <ItemDescription>{e.address}</ItemDescription> : null}
                            </ItemContent>
                            <ItemActions>
                                <Badge variant="secondary" className="text-[10px]">{e.category}</Badge>
                            </ItemActions>
                        </Item>
                    ))}
                </ItemGroup>
            )}
        </FeedCard>
    );
}
