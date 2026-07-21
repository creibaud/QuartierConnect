import { useTranslation } from "react-i18next";
import {
    Coins01Icon,
    Delete01Icon,
    Edit01Icon,
    ThumbsDownIcon,
    ThumbsUpIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useNavigate } from "@tanstack/react-router";
import { formatAddress } from "@workspace/shared/lib/address";
import { useDeleteService } from "@workspace/shared/lib/hooks/services.hooks";
import { useCreateBooking } from "@workspace/shared/lib/hooks/useBookings";
import {
    useCastVote,
    useVoteScore,
} from "@workspace/shared/lib/hooks/useVotes";
import { computeServicePoints } from "@workspace/shared/lib/pricing";
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
import { useRespond, useUnrespond } from "../hooks/services-core.hooks";
import { actionLabel, formatResponderCount } from "../lib/action-label";

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
    const isPaid = service.type === "paid";
    const pointsPrice = computeServicePoints(service);
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
                        {isPaid && (
                            <Badge variant="outline" className="tabular-nums">
                                <HugeiconsIcon icon={Coins01Icon} />
                                {pointsPrice}{" "}
                                {pointsPrice === 1
                                    ? t("bookings.pointUnit")
                                    : t("bookings.pointsUnit")}
                            </Badge>
                        )}
                    </div>
                </div>
                {service.address && (
                    <CardDescription>
                        {formatAddress(service.address)}
                    </CardDescription>
                )}
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-3">
                {service.description && (
                    <p className="text-muted-foreground line-clamp-2 text-sm">
                        {service.description}
                    </p>
                )}
                <div className="mt-auto flex flex-col gap-3 pt-1">
                    <div className="flex items-center justify-between gap-2">
                        <ServiceVoteButtons serviceId={service._id} />
                        <span className="text-muted-foreground text-xs">
                            {responderText}
                        </span>
                    </div>
                    {(!isOwn || canManage) && (
                        <div className="flex flex-wrap items-center gap-2">
                            {!isOwn && isPaid && (
                                <ReserveButton
                                    serviceId={service._id}
                                    pointsPrice={pointsPrice}
                                />
                            )}
                            {!isOwn && (
                                <RespondButton
                                    serviceId={service._id}
                                    hasResponded={service.hasResponded ?? false}
                                    ctaLabel={ctaLabel}
                                    variant={
                                        isPaid || service.hasResponded
                                            ? "outline"
                                            : "default"
                                    }
                                />
                            )}
                            {canManage && (
                                <ServiceManageButtons
                                    service={service}
                                    onEdit={onEdit}
                                />
                            )}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

function RespondButton({
    serviceId,
    hasResponded,
    ctaLabel,
    variant,
}: {
    serviceId: string;
    hasResponded: boolean;
    ctaLabel: string;
    variant: "default" | "outline";
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
            variant={variant}
            size="sm"
            disabled={respond.isPending || unrespond.isPending}
            onClick={handleClick}
        >
            {ctaLabel}
        </Button>
    );
}

function ReserveButton({
    serviceId,
    pointsPrice,
}: {
    serviceId: string;
    pointsPrice: number;
}) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const createBooking = useCreateBooking();

    function handleConfirm() {
        createBooking.mutate(
            { serviceId },
            {
                onSuccess: () => {
                    toast.success(t("pages.services.bookingRequested"));
                    void navigate({ to: "/bookings", search: { tab: "sent" } });
                },
                onError: (err) => {
                    const code = (err as { code?: string }).code;
                    const messages: Record<string, string> = {
                        ALREADY_BOOKED: t(
                            "pages.services.bookingErrors.alreadyBooked",
                        ),
                        SERVICE_NOT_PAID: t(
                            "pages.services.bookingErrors.notPaid",
                        ),
                        SERVICE_CLOSED: t(
                            "pages.services.bookingErrors.closed",
                        ),
                        CANNOT_BOOK_OWN: t(
                            "pages.services.bookingErrors.ownService",
                        ),
                        SERVICE_OUT_OF_SCOPE: t(
                            "pages.services.bookingErrors.outOfScope",
                        ),
                    };
                    toast.error(
                        (code && messages[code]) ??
                            t("pages.services.bookingError"),
                    );
                },
            },
        );
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button
                    type="button"
                    size="sm"
                    disabled={createBooking.isPending}
                >
                    {t("pages.services.reserve")}
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        {t("pages.services.confirmReserveTitle")}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {t("pages.services.confirmReserveDescription", {
                            points: pointsPrice,
                        })}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirm}>
                        {t("pages.services.reserve")}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
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
