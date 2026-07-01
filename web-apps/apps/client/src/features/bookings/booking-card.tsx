import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import {
    useAcceptBooking,
    useCancelBooking,
    useDeclineBooking,
} from "@workspace/shared/lib/hooks/useBookings";
import type { Booking } from "@workspace/shared/lib/types";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components/card";
import { toast } from "sonner";

export function BookingCard({
    booking,
    role,
}: {
    booking: Booking;
    role: "received" | "sent";
}) {
    const { t } = useTranslation();
    const accept = useAcceptBooking();
    const decline = useDeclineBooking();
    const cancel = useCancelBooking();

    const canModerate = role === "received" && booking.status === "pending";
    const canCancel =
        role === "sent" &&
        (booking.status === "pending" || booking.status === "accepted");

    return (
        <Card>
            <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-base">
                    {t("bookings.pointsLabel", { points: booking.pointsAmount })}
                </CardTitle>
                <Badge>{t(`bookings.status.${booking.status}`)}</Badge>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-2">
                {booking.contractId && (
                    <Link
                        to="/contracts/$id"
                        params={{ id: booking.contractId }}
                    >
                        <Button variant="outline" size="sm">
                            {t("bookings.viewContract")}
                        </Button>
                    </Link>
                )}
                <div className="ml-auto flex gap-2">
                    {canModerate && (
                        <>
                            <Button
                                size="sm"
                                onClick={() =>
                                    accept.mutate(booking._id, {
                                        onError: () =>
                                            toast.error(t("bookings.actionError")),
                                    })
                                }
                            >
                                {t("bookings.accept")}
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                    decline.mutate(booking._id, {
                                        onError: () =>
                                            toast.error(t("bookings.actionError")),
                                    })
                                }
                            >
                                {t("bookings.decline")}
                            </Button>
                        </>
                    )}
                    {canCancel && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                                cancel.mutate(booking._id, {
                                    onError: () =>
                                        toast.error(t("bookings.actionError")),
                                })
                            }
                        >
                            {t("bookings.cancel")}
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
