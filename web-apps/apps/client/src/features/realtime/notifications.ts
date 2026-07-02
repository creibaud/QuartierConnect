import type { QueryClient, QueryKey } from "@tanstack/react-query";
import type { TFunction } from "i18next";
import { toast } from "sonner";

export type RealtimeNotificationType =
    | "booking.created"
    | "booking.accepted"
    | "booking.declined"
    | "booking.cancelled"
    | "contract.signed"
    | "contract.fully_signed"
    | "points.settled";

export interface RealtimeNotificationPayload {
    bookingId?: string;
    contractId?: string;
    serviceTitle?: string;
    amount?: number;
    actorName?: string;
}

export interface RealtimeNotification {
    type: RealtimeNotificationType;
    payload?: RealtimeNotificationPayload;
}

interface NotificationDisplay {
    keyBase: string;
    tone: "success" | "info";
    queryKeys: QueryKey[];
}

const NOTIFICATION_DISPLAY: Record<
    RealtimeNotificationType,
    NotificationDisplay
> = {
    "booking.created": {
        keyBase: "bookingCreated",
        tone: "info",
        queryKeys: [["bookings"]],
    },
    "booking.accepted": {
        keyBase: "bookingAccepted",
        tone: "success",
        queryKeys: [["bookings"], ["contracts"]],
    },
    "booking.declined": {
        keyBase: "bookingDeclined",
        tone: "info",
        queryKeys: [["bookings"]],
    },
    "booking.cancelled": {
        keyBase: "bookingCancelled",
        tone: "info",
        queryKeys: [["bookings"]],
    },
    "contract.signed": {
        keyBase: "contractSigned",
        tone: "info",
        queryKeys: [["contracts"]],
    },
    "contract.fully_signed": {
        keyBase: "contractFullySigned",
        tone: "success",
        queryKeys: [["contracts"], ["bookings"]],
    },
    "points.settled": {
        keyBase: "pointsSettled",
        tone: "success",
        queryKeys: [["points"], ["bookings"]],
    },
};

export function handleRealtimeNotification(
    notification: RealtimeNotification,
    context: { t: TFunction; queryClient: QueryClient },
): void {
    const display = NOTIFICATION_DISPLAY[notification.type];
    if (!display) return;

    showNotificationToast(notification, display, context.t);
    for (const queryKey of display.queryKeys) {
        void context.queryClient.invalidateQueries({ queryKey });
    }
}

function showNotificationToast(
    notification: RealtimeNotification,
    display: NotificationDisplay,
    t: TFunction,
): void {
    const payload = notification.payload ?? {};
    const bodyKey =
        notification.type === "points.settled" && payload.amount === undefined
            ? "bodyNoAmount"
            : "body";

    toast[display.tone](t(`realtime.notifications.${display.keyBase}.title`), {
        description: t(`realtime.notifications.${display.keyBase}.${bodyKey}`, {
            actorName:
                payload.actorName ?? t("realtime.notifications.fallbackActor"),
            serviceTitle:
                payload.serviceTitle ??
                t("realtime.notifications.fallbackService"),
            amount: payload.amount,
        }),
    });
}
