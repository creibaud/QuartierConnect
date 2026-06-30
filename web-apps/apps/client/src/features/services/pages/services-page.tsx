import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Add01Icon, CustomerServiceIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { getCurrentUser } from "@workspace/shared/lib/auth";
import { centroidOf, pointToLatLng } from "@workspace/shared/lib/geo";
import {
    useCreateService,
    useInfiniteServices,
    useUpdateService,
} from "@workspace/shared/lib/hooks/services.hooks";
import type { Service } from "@workspace/shared/lib/types";
import { Button } from "@workspace/ui/components/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components/card";
import { DataState } from "@workspace/ui/components/data-state";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@workspace/ui/components/dialog";
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@workspace/ui/components/empty";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
    Map,
    MapControls,
    MapLegend,
    Marker,
    MarkerCluster,
    NeighborhoodPolygon,
} from "@workspace/ui/components/map";
import { PageHeader } from "@workspace/ui/components/page-header";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@workspace/ui/components/select";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Textarea } from "@workspace/ui/components/textarea";
import { toast } from "sonner";
import { useMyLocation } from "@/features/onboarding/hooks/address.hooks";
import { ServiceCard } from "../components/service-card";

const SERVICE_CATEGORIES = [
    "gardening",
    "handyman",
    "transport",
    "shopping",
    "childcare",
    "it-support",
    "other",
] as const;

const SERVICE_TYPES = ["free", "paid", "exchange"] as const;

type DirectionFilter = "all" | "offer" | "request";

export function ServicesPage() {
    const { t } = useTranslation();
    const currentUser = getCurrentUser();
    const [selectedDirection, setSelectedDirection] =
        useState<DirectionFilter>("all");
    const [createOpen, setCreateOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Service | null>(null);

    const { data: myLocation } = useMyLocation();

    const { data, isLoading, isError, fetchNextPage, hasNextPage, refetch } =
        useInfiniteServices(
            undefined,
            selectedDirection === "all" ? undefined : selectedDirection,
        );

    const services = data?.pages.flat() ?? [];
    const servicesWithCoords = services.filter((s) => s.location);

    // Focus the map on the user's OWN neighborhood — the same source as the
    // account "Mon quartier" card — so it never disagrees with their profile.
    const focusedNeighborhood = myLocation?.neighborhood ?? null;

    function canManage(service: Service): boolean {
        if (!currentUser) return false;
        if (currentUser.role === "admin") return true;
        return service.createdBy === currentUser.sub;
    }

    return (
        <div className="p-6 md:p-8">
            <div className="mx-auto flex max-w-5xl flex-col gap-6">
                <PageHeader
                    title={t("pages.services.title")}
                    description={t("pages.services.description")}
                    actions={
                        <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
                            <Select
                                value={selectedDirection}
                                onValueChange={(v) =>
                                    setSelectedDirection(v as DirectionFilter)
                                }
                            >
                                <SelectTrigger className="w-44">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        {t("pages.services.allDirections")}
                                    </SelectItem>
                                    <SelectItem value="offer">
                                        {t("pages.services.directionOffer")}
                                    </SelectItem>
                                    <SelectItem value="request">
                                        {t("pages.services.directionRequest")}
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <Button onClick={() => setCreateOpen(true)}>
                                <HugeiconsIcon icon={Add01Icon} />
                                {t("pages.services.offer")}
                            </Button>
                        </div>
                    }
                />

                {focusedNeighborhood?.geometry && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                {t("pages.services.nearby")}
                            </CardTitle>
                            <CardDescription>
                                {t("pages.services.locatedCount", {
                                    count: servicesWithCoords.length,
                                })}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {/* isolate: a new stacking context so Leaflet's high
                                z-indexes stay below the nav and sidebar */}
                            <div className="relative isolate">
                                <Map
                                    center={centroidOf(
                                        focusedNeighborhood.geometry,
                                    )}
                                    zoom={14}
                                    className="h-[420px] w-full"
                                >
                                    <NeighborhoodPolygon
                                        geometry={focusedNeighborhood.geometry}
                                        label={focusedNeighborhood.name}
                                    />
                                    {myLocation?.lat != null &&
                                        myLocation?.lng != null && (
                                            <Marker
                                                position={[
                                                    myLocation.lat,
                                                    myLocation.lng,
                                                ]}
                                                popup={t(
                                                    "pages.account.homeMarker",
                                                )}
                                            />
                                        )}
                                    <MapControls
                                        home={
                                            myLocation?.lat != null &&
                                            myLocation?.lng != null
                                                ? [
                                                      myLocation.lat,
                                                      myLocation.lng,
                                                  ]
                                                : null
                                        }
                                        fitGeometry={
                                            focusedNeighborhood?.geometry ??
                                            null
                                        }
                                    />
                                    <MarkerCluster>
                                        {servicesWithCoords.map((s) => (
                                            <Marker
                                                key={s._id}
                                                variant={
                                                    s.direction === "request"
                                                        ? "serviceRequest"
                                                        : "serviceOffer"
                                                }
                                                position={pointToLatLng(
                                                    s.location!,
                                                )}
                                                popup={
                                                    <div className="space-y-1">
                                                        <p className="font-medium">
                                                            {s.title}
                                                        </p>
                                                        <p className="text-muted-foreground text-xs">
                                                            {s.category}
                                                        </p>
                                                    </div>
                                                }
                                            />
                                        ))}
                                    </MarkerCluster>
                                    <MapLegend
                                        entries={[
                                            {
                                                variant: "serviceOffer",
                                                label: t(
                                                    "pages.services.directionOffer",
                                                ),
                                            },
                                            {
                                                variant: "serviceRequest",
                                                label: t(
                                                    "pages.services.directionRequest",
                                                ),
                                            },
                                            {
                                                variant: "home",
                                                label: t(
                                                    "pages.account.homeMarker",
                                                ),
                                            },
                                        ]}
                                    />
                                </Map>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <DataState
                    loading={isLoading}
                    error={isError ? true : undefined}
                    isEmpty={services.length === 0}
                    onRetry={() => void refetch()}
                    skeleton={
                        <div className="grid gap-4 sm:grid-cols-2">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton
                                    key={i}
                                    className="h-32 w-full rounded-xl"
                                />
                            ))}
                        </div>
                    }
                    empty={
                        <Empty className="border">
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <HugeiconsIcon icon={CustomerServiceIcon} />
                                </EmptyMedia>
                                <EmptyTitle>
                                    {t("pages.services.emptyTitle")}
                                </EmptyTitle>
                                <EmptyDescription>
                                    {t("pages.services.emptyDescription")}
                                </EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    }
                >
                    <div className="grid gap-4 sm:grid-cols-2">
                        {services.map((service) => (
                            <ServiceCard
                                key={service._id}
                                service={service}
                                currentUserId={currentUser?.sub ?? ""}
                                canManage={canManage(service)}
                                onEdit={() => setEditTarget(service)}
                            />
                        ))}
                    </div>

                    {hasNextPage && (
                        <Button
                            variant="outline"
                            className="mt-4 w-full"
                            onClick={() => fetchNextPage()}
                        >
                            {t("common.loadMore")}
                        </Button>
                    )}
                </DataState>
            </div>

            <ServiceFormDialog
                open={createOpen}
                onOpenChange={setCreateOpen}
                onSuccess={() => setCreateOpen(false)}
            />

            {editTarget && (
                <ServiceFormDialog
                    key={editTarget._id}
                    open
                    initial={editTarget}
                    onOpenChange={(open) => {
                        if (!open) setEditTarget(null);
                    }}
                    onSuccess={() => setEditTarget(null)}
                />
            )}
        </div>
    );
}

function ServiceFormDialog({
    open,
    initial,
    onOpenChange,
    onSuccess,
}: {
    open: boolean;
    initial?: Service;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}) {
    const { t } = useTranslation();
    const [title, setTitle] = useState(initial?.title ?? "");
    const [direction, setDirection] = useState<"offer" | "request">(
        (initial?.direction as "offer" | "request") ?? "offer",
    );
    const [category, setCategory] = useState(initial?.category ?? "");
    const [type, setType] = useState<"free" | "paid" | "exchange">(
        (initial?.type as "free" | "paid" | "exchange") ?? "free",
    );
    const [description, setDescription] = useState(initial?.description ?? "");
    const [address, setAddress] = useState(initial?.address ?? "");
    const createService = useCreateService();
    const updateService = useUpdateService();

    const isPending = createService.isPending || updateService.isPending;
    const isValid =
        title.trim() !== "" && category !== "" && description.trim() !== "";

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!isValid) return;
        const payload = {
            title: title.trim(),
            direction,
            category,
            type,
            description: description.trim(),
            address: address.trim() || undefined,
        };
        if (initial) {
            updateService.mutate(
                { id: initial._id, data: payload },
                {
                    onSuccess: () => {
                        toast.success(t("pages.services.updateSuccess"));
                        onSuccess();
                    },
                    onError: () => toast.error(t("pages.services.saveError")),
                },
            );
        } else {
            createService.mutate(payload, {
                onSuccess: () => {
                    toast.success(t("pages.services.createSuccess"));
                    onSuccess();
                },
                onError: () => toast.error(t("pages.services.saveError")),
            });
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {initial
                            ? t("pages.services.editTitle")
                            : t("pages.services.createTitle")}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="svc-title">
                            {t("pages.services.titleLabel")}
                        </Label>
                        <Input
                            id="svc-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={t("pages.services.titlePlaceholder")}
                            maxLength={255}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>{t("pages.services.directionLabel")}</Label>
                        <Select
                            value={direction}
                            onValueChange={(v) =>
                                setDirection(v as "offer" | "request")
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="offer">
                                    {t("pages.services.directionOffer")}
                                </SelectItem>
                                <SelectItem value="request">
                                    {t("pages.services.directionRequest")}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{t("pages.services.categoryLabel")}</Label>
                            <Select
                                value={category}
                                onValueChange={setCategory}
                            >
                                <SelectTrigger>
                                    <SelectValue
                                        placeholder={t(
                                            "pages.services.chooseCategory",
                                        )}
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    {SERVICE_CATEGORIES.map((c) => (
                                        <SelectItem key={c} value={c}>
                                            {t(
                                                `pages.services.categories.${c}`,
                                            )}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>{t("pages.services.typeLabel")}</Label>
                            <Select
                                value={type}
                                onValueChange={(v) =>
                                    setType(v as "free" | "paid" | "exchange")
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {SERVICE_TYPES.map((ty) => (
                                        <SelectItem key={ty} value={ty}>
                                            {t(`pages.services.types.${ty}`)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="svc-address">
                            {t("pages.services.addressLabel")}
                        </Label>
                        <Input
                            id="svc-address"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder={t("pages.services.addressPlaceholder")}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="svc-desc">
                            {t("pages.services.descriptionLabel")}
                        </Label>
                        <Textarea
                            id="svc-desc"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t(
                                "pages.services.descriptionPlaceholder",
                            )}
                            rows={3}
                            required
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            {t("common.cancel")}
                        </Button>
                        <Button type="submit" disabled={isPending || !isValid}>
                            {isPending
                                ? "…"
                                : initial
                                  ? t("common.save")
                                  : t("common.create")}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
