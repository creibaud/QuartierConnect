import { useTranslation } from "react-i18next";
import { getCurrentUser } from "@workspace/shared/lib/auth";
import { useMyBookings } from "@workspace/shared/lib/hooks/useBookings";
import { useServices } from "@workspace/shared/lib/hooks/services.hooks";
import { DataState } from "@workspace/ui/components/data-state";
import { PageHeader } from "@workspace/ui/components/page-header";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@workspace/ui/components/tabs";
import { BookingCard } from "../components/booking-card";
import { BookingsEmptyState } from "../components/bookings-empty-state";

export type BookingsTab = "received" | "sent";

export function BookingsPage({ initialTab }: { initialTab?: BookingsTab }) {
    const { t } = useTranslation();
    const { data, isLoading, isError, refetch } = useMyBookings();
    const { data: services } = useServices();
    const currentUser = getCurrentUser();
    const bookings = data ?? [];
    const titleOf = (serviceId: string) =>
        (services ?? []).find((s) => s._id === serviceId)?.title;

    const received = bookings.filter((b) => b.payeeId === currentUser?.sub);
    const sent = bookings.filter((b) => b.initiatorId === currentUser?.sub);
    const defaultTab: BookingsTab =
        initialTab ??
        (received.length === 0 && sent.length > 0 ? "sent" : "received");

    return (
        <div className="p-6 md:p-8">
            <div className="mx-auto flex max-w-7xl flex-col gap-6">
                <PageHeader
                    title={t("bookings.title")}
                    description={t("bookings.description")}
                />
                <DataState
                    loading={isLoading}
                    error={isError ? true : undefined}
                    isEmpty={bookings.length === 0}
                    onRetry={() => void refetch()}
                    skeleton={
                        <div className="space-y-4">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <Skeleton key={i} className="h-24 w-full rounded-xl" />
                            ))}
                        </div>
                    }
                    empty={<BookingsEmptyState message={t("bookings.empty")} />}
                >
                    <Tabs defaultValue={defaultTab}>
                        <TabsList>
                            <TabsTrigger value="received">
                                {t("bookings.tabs.received")} ({received.length})
                            </TabsTrigger>
                            <TabsTrigger value="sent">
                                {t("bookings.tabs.sent")} ({sent.length})
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="received" className="space-y-4">
                            {received.length === 0 ? (
                                <BookingsEmptyState message={t("bookings.emptyReceived")} />
                            ) : (
                                received.map((b) => (
                                    <BookingCard
                                        key={b._id}
                                        booking={b}
                                        role="received"
                                        serviceTitle={titleOf(b.serviceId)}
                                    />
                                ))
                            )}
                        </TabsContent>
                        <TabsContent value="sent" className="space-y-4">
                            {sent.length === 0 ? (
                                <BookingsEmptyState message={t("bookings.emptySent")} />
                            ) : (
                                sent.map((b) => (
                                    <BookingCard
                                        key={b._id}
                                        booking={b}
                                        role="sent"
                                        serviceTitle={titleOf(b.serviceId)}
                                    />
                                ))
                            )}
                        </TabsContent>
                    </Tabs>
                </DataState>
            </div>
        </div>
    );
}
