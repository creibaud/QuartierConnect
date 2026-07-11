import { useTranslation } from "react-i18next";
import { Calendar01Icon, Coins01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";
import {
    useAcceptBooking,
    useCancelBooking,
    useDeclineBooking,
} from "@workspace/shared/lib/hooks/useBookings";
import type { Booking } from "@workspace/shared/lib/types";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import {
    StatusBadge,
    statusTone,
} from "@workspace/ui/components/status-badge";
import { toast } from "sonner";

export function BookingCard({
    booking,
    role,
    serviceTitle,
}: {
    booking: Booking;
    role: "received" | "sent";
    serviceTitle?: string;
}) {
    const { t, i18n } = useTranslation();
    const accept = useAcceptBooking();
    const decline = useDeclineBooking();
    const cancel = useCancelBooking();

    const canModerate = role === "received" && booking.status === "pending";
    const canCancel =
        role === "sent" &&
        (booking.status === "pending" || booking.status === "accepted");
    const onError = () => toast.error(t("bookings.actionError"));
    const date = new Date(booking.createdAt).toLocaleDateString(i18n.language, {
        day: "numeric",
        month: "short",
        year: "numeric",
    });

    return (
        <Card className="transition-colors hover:border-primary/40">
            <CardContent className="flex items-center gap-4 p-5">
                <div className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
                    <HugeiconsIcon icon={Coins01Icon} className="size-5" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-medium">
                            {serviceTitle ?? t("bookings.serviceFallback")}
                        </h3>
                        <StatusBadge tone={statusTone(booking.status)}>
                            {t(`bookings.status.${booking.status}`)}
                        </StatusBadge>
                    </div>
                    <p className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-sm">
                        <span>
                            <span className="text-foreground font-medium tabular-nums">
                                {booking.pointsAmount}
                            </span>{" "}
                            {booking.pointsAmount === 1
                                ? t("bookings.pointUnit")
                                : t("bookings.pointsUnit")}
                        </span>
                        <span aria-hidden>·</span>
                        <span className="inline-flex items-center gap-1">
                            <HugeiconsIcon
                                icon={Calendar01Icon}
                                className="size-3.5"
                            />
                            {date}
                        </span>
                    </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                    {booking.contractId && (
                        <Button asChild variant="outline" size="sm">
                            <Link
                                to="/contracts/$id"
                                params={{ id: booking.contractId }}
                            >
                                {t("bookings.viewContract")}
                            </Link>
                        </Button>
                    )}
                    {canModerate && (
                        <>
                            <Button
                                size="sm"
                                onClick={() => accept.mutate(booking._id, { onError })}
                            >
                                {t("bookings.accept")}
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => decline.mutate(booking._id, { onError })}
                            >
                                {t("bookings.decline")}
                            </Button>
                        </>
                    )}
                    {canCancel && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => cancel.mutate(booking._id, { onError })}
                        >
                            {t("bookings.cancel")}
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
