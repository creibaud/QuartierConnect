import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Add01Icon,
    Calendar01Icon,
    GridViewIcon,
    ListViewIcon,
    Location01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEvents } from "@workspace/shared/lib/hooks/events.hooks";
import { Button } from "@workspace/ui/components/button";
import { DataState } from "@workspace/ui/components/data-state";
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@workspace/ui/components/empty";
import { PageHeader } from "@workspace/ui/components/page-header";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { ToggleGroup } from "@workspace/ui/components/toggle-group";
import { CreateEventDialog } from "../components/create-event-dialog";
import { EventsCalendarView } from "../components/events-calendar-view";
import { EventsListView } from "../components/events-list-view";
import { EventsMapView } from "../components/events-map-view";
import { EventsSwipeView } from "../components/events-swipe-view";
import {
    ViewToggleItem,
    type ViewMode,
} from "../components/event-view-toggle";
import { upcomingEvents } from "../lib/events-filter";

export function EventsPage() {
    const { t } = useTranslation();
    const [createOpen, setCreateOpen] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>("calendar");
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(
        undefined,
    );

    const { data, isLoading, isError, refetch } = useEvents();
    const events = data ?? [];
    const upcoming = upcomingEvents(events);

    return (
        <div className="p-6 md:p-8">
            <div className="mx-auto flex max-w-7xl flex-col gap-6">
                <PageHeader
                    title={t("pages.events.title")}
                    description={t("pages.events.description")}
                    actions={
                        <div className="flex items-center gap-2">
                            <ToggleGroup
                                type="single"
                                variant="outline"
                                size="sm"
                                value={viewMode}
                                onValueChange={(value) => {
                                    if (value) setViewMode(value as ViewMode);
                                }}
                            >
                                <ViewToggleItem
                                    value="calendar"
                                    label={t("pages.events.viewCalendar")}
                                    icon={Calendar01Icon}
                                />
                                <ViewToggleItem
                                    value="list"
                                    label={t("pages.events.viewList")}
                                    icon={ListViewIcon}
                                />
                                <ViewToggleItem
                                    value="swipe"
                                    label={t("pages.events.viewSwipe")}
                                    icon={GridViewIcon}
                                />
                                <ViewToggleItem
                                    value="map"
                                    label={t("pages.events.viewMap")}
                                    icon={Location01Icon}
                                />
                            </ToggleGroup>
                            <Button onClick={() => setCreateOpen(true)}>
                                <HugeiconsIcon icon={Add01Icon} />
                                {t("common.create")}
                            </Button>
                        </div>
                    }
                />

                <DataState
                    loading={isLoading}
                    error={isError ? true : undefined}
                    isEmpty={viewMode === "list" && events.length === 0}
                    onRetry={() => void refetch()}
                    skeleton={<Skeleton className="h-72 w-full rounded-xl" />}
                    empty={
                        <Empty className="border">
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <HugeiconsIcon icon={Calendar01Icon} />
                                </EmptyMedia>
                                <EmptyTitle>
                                    {t("pages.events.emptyTitle")}
                                </EmptyTitle>
                                <EmptyDescription>
                                    {t("pages.events.emptyDescription")}
                                </EmptyDescription>
                            </EmptyHeader>
                            <EmptyContent>
                                <Button onClick={() => setCreateOpen(true)}>
                                    <HugeiconsIcon icon={Add01Icon} />
                                    {t("pages.events.create")}
                                </Button>
                            </EmptyContent>
                        </Empty>
                    }
                >
                    {viewMode === "calendar" ? (
                        <EventsCalendarView
                            events={events}
                            upcoming={upcoming}
                            selectedDate={selectedDate}
                            onSelectDate={setSelectedDate}
                        />
                    ) : viewMode === "swipe" ? (
                        <EventsSwipeView events={upcoming} />
                    ) : viewMode === "map" ? (
                        <EventsMapView events={events} />
                    ) : (
                        <EventsListView events={events} />
                    )}
                </DataState>

                <CreateEventDialog
                    open={createOpen}
                    onOpenChange={setCreateOpen}
                    onSuccess={() => setCreateOpen(false)}
                />
            </div>
        </div>
    );
}
