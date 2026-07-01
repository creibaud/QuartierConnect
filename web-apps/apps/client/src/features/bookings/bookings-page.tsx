import { useTranslation } from "react-i18next";
import { getCurrentUser } from "@workspace/shared/lib/auth";
import { useMyBookings } from "@workspace/shared/lib/hooks/useBookings";
import { DataState } from "@workspace/ui/components/data-state";
import { PageHeader } from "@workspace/ui/components/page-header";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@workspace/ui/components/tabs";
import { BookingCard } from "./booking-card";

export function BookingsPage() {
    const { t } = useTranslation();
    const { data, isLoading, isError, refetch } = useMyBookings();
    const currentUser = getCurrentUser();
    const bookings = data ?? [];

    const received = bookings.filter((b) => b.payeeId === currentUser?.sub);
    const sent = bookings.filter((b) => b.initiatorId === currentUser?.sub);

    return (
        <div className="mx-auto w-full max-w-7xl space-y-6">
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
                empty={
                    <p className="text-muted-foreground text-sm">
                        {t("bookings.empty")}
                    </p>
                }
            >
                <Tabs defaultValue="received">
                    <TabsList>
                        <TabsTrigger value="received">
                            {t("bookings.tabs.received")}
                        </TabsTrigger>
                        <TabsTrigger value="sent">
                            {t("bookings.tabs.sent")}
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="received" className="space-y-4">
                        {received.map((b) => (
                            <BookingCard key={b._id} booking={b} role="received" />
                        ))}
                    </TabsContent>
                    <TabsContent value="sent" className="space-y-4">
                        {sent.map((b) => (
                            <BookingCard key={b._id} booking={b} role="sent" />
                        ))}
                    </TabsContent>
                </Tabs>
            </DataState>
        </div>
    );
}
