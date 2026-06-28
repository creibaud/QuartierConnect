import { Alert01Icon, Calendar01Icon, CustomerServiceIcon, ThumbsUpIcon } from "@hugeicons/core-free-icons";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { apiGet } from "@workspace/shared/lib/api";
import { useEvents } from "@workspace/shared/lib/hooks/events.hooks";
import { useInfiniteIncidents } from "@workspace/shared/lib/hooks/incidents.hooks";
import { useServices } from "@workspace/shared/lib/hooks/services.hooks";
import { Button } from "@workspace/ui/components/button";
import {
    countOpenIncidents,
    countOpenVotes,
    countUpcomingEvents,
    selectOpenVotes,
} from "../lib/kpis";
import { EmptyBlock, FeedCard, Rows } from "./feed-card";
import { KpiCard } from "./kpi-card";

interface CommunityVote {
    _id: string;
    title: string;
    status: "open" | "closed";
}

export function ModerationOverview({ now }: { now: number }) {
    const { t } = useTranslation();

    const { data: incidentsData, isLoading: incidentsLoading } = useInfiniteIncidents(20, "open");
    const incidents = incidentsData?.pages?.[0] ?? [];
    const { data: votes } = useQuery<CommunityVote[]>({
        queryKey: ["community-votes"],
        queryFn: () => apiGet<CommunityVote[]>("/community-votes"),
    });
    const { data: events } = useEvents();
    const { data: services } = useServices();

    const openVotes = selectOpenVotes(votes ?? []);

    return (
        <section className="space-y-4">
            <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                {t("pages.dashboard.moderation.title")}
            </h2>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <KpiCard
                    label={t("pages.dashboard.kpi.openIncidents")}
                    value={countOpenIncidents(incidents)}
                    icon={Alert01Icon}
                    to="/incidents"
                />
                <KpiCard
                    label={t("pages.dashboard.kpi.openVotes")}
                    value={countOpenVotes(votes ?? [])}
                    icon={ThumbsUpIcon}
                    to="/votes"
                />
                <KpiCard
                    label={t("pages.dashboard.kpi.upcomingEvents")}
                    value={countUpcomingEvents(events ?? [], now)}
                    icon={Calendar01Icon}
                    to="/events"
                />
                <KpiCard
                    label={t("pages.dashboard.kpi.services")}
                    value={(services ?? []).length}
                    icon={CustomerServiceIcon}
                    to="/services"
                />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <FeedCard
                    title={t("pages.dashboard.moderation.openIncidents")}
                    to="/incidents"
                    icon={Alert01Icon}
                >
                    {incidentsLoading ? (
                        <Rows count={3} />
                    ) : incidents.length === 0 ? (
                        <EmptyBlock icon={Alert01Icon} text={t("pages.dashboard.moderation.noIncidents")} />
                    ) : (
                        <ul className="space-y-2">
                            {incidents.slice(0, 4).map((i) => (
                                <li key={i.id} className="flex items-center justify-between gap-2 text-sm">
                                    <span className="truncate font-medium">{i.title}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </FeedCard>

                <FeedCard
                    title={t("pages.dashboard.moderation.pendingVotes")}
                    to="/votes"
                    icon={ThumbsUpIcon}
                >
                    {openVotes.length === 0 ? (
                        <EmptyBlock icon={ThumbsUpIcon} text={t("pages.dashboard.moderation.noPendingVotes")} />
                    ) : (
                        <ul className="space-y-2">
                            {openVotes.map((v) => (
                                <li key={v._id} className="flex items-center justify-between gap-2">
                                    <span className="truncate text-sm font-medium">{v.title}</span>
                                    <Button asChild size="sm" variant="outline" className="shrink-0">
                                        <Link to="/votes">{t("pages.dashboard.respond")}</Link>
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    )}
                </FeedCard>
            </div>
        </section>
    );
}
