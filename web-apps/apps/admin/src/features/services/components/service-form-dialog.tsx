import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
    centroidOf,
    latLngToPoint,
} from "@workspace/shared/lib/geo";
import {
    useCreateService,
    useUpdateService,
} from "@workspace/shared/lib/hooks/services.hooks";
import type { Neighborhood, Service } from "@workspace/shared/lib/types";
import { Button } from "@workspace/ui/components/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
    Map,
    MapClickHandler,
    Marker,
    NeighborhoodPolygon,
} from "@workspace/ui/components/map";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@workspace/ui/components/select";
import { Spinner } from "@workspace/ui/components/spinner";
import { Textarea } from "@workspace/ui/components/textarea";
import { toast } from "sonner";
import { SERVICE_CATEGORIES } from "../lib/service-categories";

export function ServiceFormDialog({
    open,
    initial,
    neighborhoods,
    onOpenChange,
    onSuccess,
}: {
    open: boolean;
    initial?: Service;
    neighborhoods: Neighborhood[];
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}) {
    const { t } = useTranslation();
    const [name, setName] = useState(initial?.title ?? "");
    const [category, setCategory] = useState(initial?.category ?? "");
    const [type, setType] = useState<"free" | "paid" | "exchange">(
        (initial?.type as "free" | "paid" | "exchange") ?? "free",
    );
    const [direction, setDirection] = useState<"offer" | "request">(
        (initial?.direction as "offer" | "request") ?? "offer",
    );
    const [duration, setDuration] = useState<number | "">(
        initial?.duration ?? "",
    );
    const [description, setDescription] = useState(initial?.description ?? "");
    const [address, setAddress] = useState(initial?.address ?? "");
    const [neighborhoodId, setNeighborhoodId] = useState(
        initial?.neighborhoodId ?? "",
    );
    const [pointsMultiplier, setPointsMultiplier] = useState(
        initial?.pointsMultiplier != null
            ? String(initial.pointsMultiplier)
            : "",
    );
    const initialCoords = initial?.location?.coordinates;
    const [pickedLat, setPickedLat] = useState<number | null>(
        initialCoords ? initialCoords[1] : null,
    );
    const [pickedLng, setPickedLng] = useState<number | null>(
        initialCoords ? initialCoords[0] : null,
    );
    const createService = useCreateService();
    const updateService = useUpdateService();
    const firstNeighborhood = neighborhoods.find((n) => n.geometry);

    const isPending = createService.isPending || updateService.isPending;
    const isDurationValid =
        type !== "paid" || (typeof duration === "number" && duration >= 1);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim() || !category.trim() || !isDurationValid) return;
        const location =
            pickedLat !== null && pickedLng !== null
                ? latLngToPoint(pickedLat, pickedLng)
                : undefined;
        const payload = {
            title: name.trim(),
            category: category.trim(),
            type,
            direction,
            duration:
                type === "paid" && typeof duration === "number"
                    ? duration
                    : undefined,
            description: description.trim() || undefined,
            address: address.trim() || undefined,
            neighborhoodId: neighborhoodId || undefined,
            pointsMultiplier: pointsMultiplier
                ? Number(pointsMultiplier)
                : undefined,
            location,
        };
        if (initial) {
            updateService.mutate(
                { id: initial._id, data: payload },
                {
                    onSuccess: () => {
                        toast.success(t("adminPages.services.updated"));
                        onSuccess();
                    },
                    onError: () =>
                        toast.error(t("adminPages.common.saveError")),
                },
            );
        } else {
            createService.mutate(payload, {
                onSuccess: () => {
                    toast.success(t("adminPages.services.created"));
                    onSuccess();
                },
                onError: () => toast.error(t("adminPages.common.saveError")),
            });
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {initial
                            ? t("adminPages.services.editTitle")
                            : t("adminPages.services.addCta")}
                    </DialogTitle>
                    <DialogDescription>
                        {t("adminPages.services.description")}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="svc-name">
                            {t("adminPages.services.nameLabel")}
                        </Label>
                        <Input
                            id="svc-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t(
                                "adminPages.services.namePlaceholder",
                            )}
                            maxLength={255}
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="svc-category">
                                {t("adminPages.services.categoryLabel")}
                            </Label>
                            <Select
                                value={category}
                                onValueChange={setCategory}
                            >
                                <SelectTrigger id="svc-category">
                                    <SelectValue
                                        placeholder={t(
                                            "adminPages.services.categoryPlaceholder",
                                        )}
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    {SERVICE_CATEGORIES.map((c) => (
                                        <SelectItem key={c} value={c}>
                                            {t(
                                                `adminPages.serviceCategories.${c}`,
                                                { defaultValue: c },
                                            )}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="svc-type">
                                {t("adminPages.services.typeLabel")}
                            </Label>
                            <Select
                                value={type}
                                onValueChange={(v) =>
                                    setType(v as "free" | "paid" | "exchange")
                                }
                            >
                                <SelectTrigger id="svc-type">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="free">
                                        {t("adminPages.services.types.free")}
                                    </SelectItem>
                                    <SelectItem value="paid">
                                        {t("adminPages.services.types.paid")}
                                    </SelectItem>
                                    <SelectItem value="exchange">
                                        {t(
                                            "adminPages.services.types.exchange",
                                        )}
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="svc-direction">
                                {t("adminPages.services.directionLabel")}
                            </Label>
                            <Select
                                value={direction}
                                onValueChange={(v) =>
                                    setDirection(v as "offer" | "request")
                                }
                            >
                                <SelectTrigger id="svc-direction">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="offer">
                                        {t(
                                            "adminPages.services.directionOffer",
                                        )}
                                    </SelectItem>
                                    <SelectItem value="request">
                                        {t(
                                            "adminPages.services.directionRequest",
                                        )}
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    {type === "paid" && (
                        <div className="space-y-2">
                            <Label htmlFor="svc-duration">
                                {t("pages.services.durationLabel")}
                            </Label>
                            <Input
                                id="svc-duration"
                                type="number"
                                min={1}
                                value={duration}
                                onChange={(e) =>
                                    setDuration(
                                        e.target.value === ""
                                            ? ""
                                            : Number(e.target.value),
                                    )
                                }
                                placeholder={t(
                                    "pages.services.durationPlaceholder",
                                )}
                                required
                            />
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="svc-address">
                            {t("adminPages.services.addressLabel")}
                        </Label>
                        <Input
                            id="svc-address"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder={t(
                                "adminPages.services.addressPlaceholder",
                            )}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="svc-points-multiplier">
                            {t("adminPages.services.pointsMultiplierLabel")}
                        </Label>
                        <Input
                            id="svc-points-multiplier"
                            type="number"
                            min={0.1}
                            max={10}
                            step={0.1}
                            value={pointsMultiplier}
                            onChange={(e) => setPointsMultiplier(e.target.value)}
                            placeholder="1"
                        />
                        <p className="text-muted-foreground text-xs">
                            {t("adminPages.services.pointsMultiplierHint")}
                        </p>
                    </div>
                    {neighborhoods.length > 0 && (
                        <div className="space-y-2">
                            <Label htmlFor="svc-neighborhood">
                                {t("incidents.fields.neighborhood")}
                            </Label>
                            <Select
                                value={neighborhoodId}
                                onValueChange={setNeighborhoodId}
                            >
                                <SelectTrigger id="svc-neighborhood">
                                    <SelectValue
                                        placeholder={t(
                                            "adminPages.common.chooseNeighborhood",
                                        )}
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    {neighborhoods.map((n) => (
                                        <SelectItem key={n._id} value={n._id}>
                                            {n.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="svc-desc">
                            {t("incidents.fields.description")}
                        </Label>
                        <Textarea
                            id="svc-desc"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                        />
                    </div>
                    {firstNeighborhood?.geometry && (
                        <div className="space-y-2">
                            <p className="text-sm leading-none font-medium">
                                {t("adminPages.services.positionLabel")}
                                {pickedLat !== null && pickedLng !== null
                                    ? ` (${pickedLat.toFixed(4)}, ${pickedLng.toFixed(4)})`
                                    : ` ${t("adminPages.services.optional")}`}
                            </p>
                            <Map
                                center={
                                    pickedLat !== null && pickedLng !== null
                                        ? [pickedLat, pickedLng]
                                        : centroidOf(firstNeighborhood.geometry)
                                }
                                zoom={14}
                                className="h-64"
                            >
                                <NeighborhoodPolygon
                                    geometry={firstNeighborhood.geometry}
                                />
                                <MapClickHandler
                                    onClick={(lat, lng) => {
                                        setPickedLat(lat);
                                        setPickedLng(lng);
                                    }}
                                />
                                {pickedLat !== null && pickedLng !== null && (
                                    <Marker
                                        variant="service"
                                        position={[pickedLat, pickedLng]}
                                    />
                                )}
                            </Map>
                        </div>
                    )}
                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            {t("common.cancel")}
                        </Button>
                        <Button
                            type="submit"
                            disabled={
                                isPending ||
                                !name.trim() ||
                                !category.trim() ||
                                !isDurationValid
                            }
                        >
                            {isPending ? <Spinner className="mr-2" /> : null}
                            {initial
                                ? t("common.save")
                                : t("adminPages.common.create")}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
