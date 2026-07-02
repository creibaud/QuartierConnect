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
    Item,
    ItemActions,
    ItemContent,
    ItemDescription,
    ItemGroup,
    ItemTitle,
} from "@workspace/ui/components/item";
import type { CommunityVote } from "../lib/community-vote";
import {
    countOpenIncidents,
    countOpenVotes,
    countUpcomingEvents,
    selectOpenVotes,
} from "../lib/kpis";
import { EmptyBlock, FeedCard, Rows } from "./feed-card";
import { KpiCard } from "./kpi-card";

const INCIDENT_DOT: Record<string, string> = {
    open: "bg-amber-500",
    in_progress: "bg-blue-500",
    resolved: "bg-emerald-500",
};

export function ModerationOverview({ now }: { now: number }) {
    const { t, i18n } = useTranslation();
    const fmtDate = (d: string) =>
        new Date(d).toLocaleDateString(i18n.language, {
            day: "numeric",
            month: "short",
        });

    const { data: incidentsData, isLoading: incidentsLoading } = useInfiniteIncidents(20, "open");
    const incidents = incidentsData?.pages?.[0] ?? [];
    const { data: votes, isLoading: votesLoading } = useQuery<CommunityVote[]>({
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
                        <EmptyBlock icon={Alert01Icon} title={t("pages.dashboard.moderation.noIncidents")} />
                    ) : (
                        <ItemGroup className="gap-2">
                            {incidents.slice(0, 4).map((i) => (
                                <Item key={i.id} variant="outline" size="sm" asChild>
                                    <Link to="/incidents/$id" params={{ id: i.id }}>
                                        <span
                                            className={`size-2.5 shrink-0 rounded-full ${INCIDENT_DOT[i.status]}`}
                                            aria-hidden
                                        />
                                        <ItemContent>
                                            <ItemTitle className="truncate">
                                                {i.title}
                                            </ItemTitle>
                                            <ItemDescription>
                                                {fmtDate(i.createdAt)}
                                            </ItemDescription>
                                        </ItemContent>
                                    </Link>
                                </Item>
                            ))}
                        </ItemGroup>
                    )}
                </FeedCard>

                <FeedCard
                    title={t("pages.dashboard.moderation.pendingVotes")}
                    to="/votes"
                    icon={ThumbsUpIcon}
                >
                    {votesLoading ? (
                        <Rows count={3} />
                    ) : openVotes.length === 0 ? (
                        <EmptyBlock icon={ThumbsUpIcon} title={t("pages.dashboard.moderation.noPendingVotes")} />
                    ) : (
                        <ItemGroup className="gap-2">
                            {openVotes.map((v) => (
                                <Item key={v._id} variant="outline" size="sm">
                                    <ItemContent>
                                        <ItemTitle className="truncate">
                                            {v.title}
                                        </ItemTitle>
                                        {v.endsAt && (
                                            <ItemDescription>
                                                {fmtDate(v.endsAt)}
                                            </ItemDescription>
                                        )}
                                    </ItemContent>
                                    <ItemActions>
                                        <Button asChild size="sm" variant="outline">
                                            <Link to="/votes">
                                                {t("pages.dashboard.respond")}
                                            </Link>
                                        </Button>
                                    </ItemActions>
                                </Item>
                            ))}
                        </ItemGroup>
                    )}
                </FeedCard>
            </div>
        </section>
    );
}
