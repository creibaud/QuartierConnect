import { Tick02Icon, UserGroupIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslation } from "react-i18next";
import { useEventInterest } from "@workspace/shared/lib/hooks/events.hooks";
import { useMyProfile } from "@workspace/shared/lib/hooks/useMe";
import type { Event } from "@workspace/shared/lib/types";
import { Button } from "@workspace/ui/components/button";
import { toast } from "sonner";

export function ParticipantCount({ count }: { count: number }) {
    const { t } = useTranslation();
    return (
        <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <HugeiconsIcon icon={UserGroupIcon} className="size-4 shrink-0" />
            {t("pages.events.participants", { count })}
        </span>
    );
}

export function ParticipateButton({ event }: { event: Event }) {
    const { t } = useTranslation();
    const { data: me } = useMyProfile();
    const interest = useEventInterest();

    const isRegistered =
        me != null && (event.interestedUserIds ?? []).includes(me.id);
    const isPast = new Date(event.date) < new Date();

    if (isRegistered) {
        return (
            <Button type="button" variant="outline" size="sm" disabled>
                <HugeiconsIcon icon={Tick02Icon} />
                {t("pages.events.registered")}
            </Button>
        );
    }

    if (isPast) return null;

    return (
        <Button
            type="button"
            size="sm"
            disabled={interest.isPending}
            onClick={(clickEvent) => {
                clickEvent.stopPropagation();
                interest.mutate(
                    { eventId: event._id, source: "participate" },
                    {
                        onError: () =>
                            toast.error(t("pages.events.participateError")),
                    },
                );
            }}
        >
            {t("pages.events.participate")}
        </Button>
    );
}

export function EventParticipation({ event }: { event: Event }) {
    return (
        <div className="flex items-center justify-between gap-2">
            <ParticipantCount count={event.interestedUserIds?.length ?? 0} />
            <ParticipateButton event={event} />
        </div>
    );
}
