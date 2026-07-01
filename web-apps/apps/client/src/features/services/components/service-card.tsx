import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";
import {
    Delete01Icon,
    Edit01Icon,
    ThumbsDownIcon,
    ThumbsUpIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    useDeleteService,
} from "@workspace/shared/lib/hooks/services.hooks";
import { useCreateBooking } from "@workspace/shared/lib/hooks/useBookings";
import {
    useCastVote,
    useVoteScore,
} from "@workspace/shared/lib/hooks/useVotes";
import type { Service } from "@workspace/shared/lib/types";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components/card";
import { toast } from "sonner";
import { actionLabel, formatResponderCount } from "../lib/action-label";
import { useRespond, useUnrespond } from "../hooks/services-core.hooks";

interface ServiceCardProps {
    service: Service;
    currentUserId: string;
    canManage: boolean;
    onEdit: () => void;
}

export function ServiceCard({
    service,
    currentUserId,
    canManage,
    onEdit,
}: ServiceCardProps) {
    const { t } = useTranslation();

    const isOwn = service.createdBy === currentUserId;
    const directionLabel =
        service.direction === "offer"
            ? t("pages.services.directionOffer")
            : t("pages.services.directionRequest");
    const ctaLabel = actionLabel(
        service.direction,
        service.hasResponded ?? false,
        t,
    );
    const responderText = formatResponderCount(service.responderCount ?? 0, t);

    return (
        <Card className="flex h-full flex-col">
            <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-2">
                    <CardTitle className="text-base">{service.title}</CardTitle>
                    <div className="flex shrink-0 items-center gap-1">
                        <Badge
                            variant={
                                service.direction === "offer"
                                    ? "default"
                                    : "secondary"
                            }
                        >
                            {directionLabel}
                        </Badge>
                        <Badge variant="outline">
                            {t(`pages.services.categories.${service.category}`)}
                        </Badge>
                        <Badge variant="outline">
                            {t(`pages.services.types.${service.type}`)}
                        </Badge>
                    </div>
                </div>
                {service.address && (
                    <CardDescription>{service.address}</CardDescription>
                )}
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-3">
                {service.description && (
                    <p className="text-muted-foreground line-clamp-2 text-sm">
                        {service.description}
                    </p>
                )}
                <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
                    <ServiceVoteButtons serviceId={service._id} />
                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs">
                            {responderText}
                        </span>
                        {!isOwn && (
                            <RespondButton
                                serviceId={service._id}
                                hasResponded={service.hasResponded ?? false}
                                ctaLabel={ctaLabel}
                            />
                        )}
                        {!isOwn && service.type === "paid" && (
                            <ReserveButton serviceId={service._id} />
                        )}
                        {canManage && (
                            <ServiceManageButtons
                                service={service}
                                onEdit={onEdit}
                            />
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function RespondButton({
    serviceId,
    hasResponded,
    ctaLabel,
}: {
    serviceId: string;
    hasResponded: boolean;
    ctaLabel: string;
}) {
    const { t } = useTranslation();
    const respond = useRespond();
    const unrespond = useUnrespond();

    function handleClick() {
        if (hasResponded) {
            unrespond.mutate(serviceId, {
                onError: () => toast.error(t("pages.services.respondError")),
            });
        } else {
            respond.mutate(serviceId, {
                onError: () => toast.error(t("pages.services.respondError")),
            });
        }
    }

    return (
        <Button
            type="button"
            variant={hasResponded ? "outline" : "default"}
            size="sm"
            disabled={respond.isPending || unrespond.isPending}
            onClick={handleClick}
        >
            {ctaLabel}
        </Button>
    );
}

function ReserveButton({ serviceId }: { serviceId: string }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const createBooking = useCreateBooking();

    return (
        <Button
            type="button"
            size="sm"
            disabled={createBooking.isPending}
            onClick={() =>
                createBooking.mutate(
                    { serviceId },
                    {
                        onSuccess: () => {
                            toast.success(t("pages.services.bookingRequested"));
                            void navigate({ to: "/bookings" });
                        },
                        onError: () =>
                            toast.error(t("pages.services.bookingError")),
                    },
                )
            }
        >
            {t("pages.services.reserve")}
        </Button>
    );
}

function ServiceVoteButtons({ serviceId }: { serviceId: string }) {
    const { t } = useTranslation();
    const { data: voteScore } = useVoteScore(serviceId, "service");
    const castVote = useCastVote();
    const breakdown = voteScore?.breakdown as
        | { like?: number; dislike?: number }
        | undefined;

    return (
        <div className="flex items-center gap-1">
            <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={castVote.isPending}
                onClick={() =>
                    castVote.mutate(
                        {
                            targetId: serviceId,
                            targetType: "service",
                            voteType: "like",
                        },
                        { onError: () => toast.error(t("votes.voteError")) },
                    )
                }
                className="text-muted-foreground"
            >
                <HugeiconsIcon icon={ThumbsUpIcon} />
                <span className="tabular-nums">{breakdown?.like ?? 0}</span>
            </Button>
            <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={castVote.isPending}
                onClick={() =>
                    castVote.mutate(
                        {
                            targetId: serviceId,
                            targetType: "service",
                            voteType: "dislike",
                        },
                        { onError: () => toast.error(t("votes.voteError")) },
                    )
                }
                className="text-muted-foreground"
            >
                <HugeiconsIcon icon={ThumbsDownIcon} />
                <span className="tabular-nums">{breakdown?.dislike ?? 0}</span>
            </Button>
        </div>
    );
}

function ServiceManageButtons({
    service,
    onEdit,
}: {
    service: Service;
    onEdit: () => void;
}) {
    const { t } = useTranslation();
    const deleteService = useDeleteService();

    function handleDelete() {
        deleteService.mutate(service._id, {
            onSuccess: () => toast.success(t("pages.services.deleteSuccess")),
            onError: () => toast.error(t("pages.services.deleteError")),
        });
    }

    return (
        <div className="flex items-center gap-1">
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onEdit}
                className="text-muted-foreground"
            >
                <HugeiconsIcon icon={Edit01Icon} />
                <span className="sr-only">{t("common.edit")}</span>
            </Button>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={deleteService.isPending}
                        className="text-destructive hover:text-destructive"
                    >
                        <HugeiconsIcon icon={Delete01Icon} />
                        <span className="sr-only">{t("common.delete")}</span>
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {t("pages.services.deleteConfirmTitle")}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("pages.services.deleteConfirmDescription", {
                                title: service.title,
                            })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>
                            {t("common.cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            onClick={handleDelete}
                        >
                            {t("common.delete")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
