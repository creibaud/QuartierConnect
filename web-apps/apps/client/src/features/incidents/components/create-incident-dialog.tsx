import { useState } from "react";
import { useTranslation } from "react-i18next";
import { centroidOf, pointInPolygon } from "@workspace/shared/lib/geo";
import { useCreateIncident } from "@workspace/shared/lib/hooks/incidents.hooks";
import { useNeighborhoods } from "@workspace/shared/lib/hooks/neighborhoods.hooks";
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
    MapControls,
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
import { Textarea } from "@workspace/ui/components/textarea";
import { toast } from "sonner";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import { useMyLocation } from "@/features/onboarding/hooks/address.hooks";

export function CreateIncidentDialog({
    open,
    onOpenChange,
    onSuccess,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}) {
    const { t } = useTranslation();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState<
        "neighborhood" | "reporting" | "bug"
    >("neighborhood");
    const [pickedLat, setPickedLat] = useState<number | null>(null);
    const [pickedLng, setPickedLng] = useState<number | null>(null);
    const [address, setAddress] = useState("");
    const createIncident = useCreateIncident();
    const { data: neighborhoods } = useNeighborhoods();
    const { data: myLocation } = useMyLocation();
    const firstNeighborhood = neighborhoods?.find((n) => n.geometry);
    const missingRequiredFields = !title.trim() || !description.trim();

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!title.trim() || !description.trim()) return;
        createIncident.mutate(
            {
                title: title.trim(),
                description: description.trim(),
                category,
                lat: pickedLat ?? undefined,
                lng: pickedLng ?? undefined,
            },
            {
                onSuccess: () => {
                    toast.success(t("pages.incidents.reportSuccess"));
                    setTitle("");
                    setDescription("");
                    setCategory("neighborhood");
                    setPickedLat(null);
                    setPickedLng(null);
                    setAddress("");
                    onSuccess();
                },
                onError: () => toast.error(t("pages.incidents.reportError")),
            },
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="text-xl">
                        {t("incidents.new")}
                    </DialogTitle>
                    <DialogDescription>
                        {t("incidents.newDescription")}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="incident-title">
                            {t("pages.incidents.titleRequired")}
                        </Label>
                        <Input
                            id="incident-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={t("pages.incidents.titlePlaceholder")}
                            maxLength={255}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="incident-description">
                            {t("pages.incidents.descriptionRequired")}
                        </Label>
                        <Textarea
                            id="incident-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t(
                                "pages.incidents.descriptionPlaceholder",
                            )}
                            rows={3}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>{t("pages.incidents.categoryLabel")}</Label>
                        <Select
                            value={category}
                            onValueChange={(v) =>
                                setCategory(
                                    v as "neighborhood" | "reporting" | "bug",
                                )
                            }
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {(
                                    ["neighborhood", "reporting", "bug"] as const
                                ).map((c) => (
                                    <SelectItem key={c} value={c}>
                                        {t(`pages.incidents.categories.${c}`)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="incident-address">
                            {t("pages.incidents.addressLabel")}
                        </Label>
                        <AddressAutocomplete
                            id="incident-address"
                            value={address}
                            onChange={setAddress}
                            onSelect={(s) => {
                                setAddress(s.label);
                                setPickedLat(s.lat);
                                setPickedLng(s.lng);
                            }}
                        />
                        {pickedLat != null &&
                            pickedLng != null &&
                            myLocation?.neighborhood?.geometry &&
                            !pointInPolygon(
                                pickedLat,
                                pickedLng,
                                myLocation.neighborhood.geometry,
                            ) && (
                                <p className="text-xs text-amber-600 dark:text-amber-500">
                                    {t("address.outsideQuartier")}
                                </p>
                            )}
                    </div>
                    {firstNeighborhood?.geometry && (
                        <div className="space-y-2">
                            <Label>
                                {t("pages.incidents.locationPick")}
                                {pickedLat !== null && pickedLng !== null
                                    ? ` (${pickedLat.toFixed(4)}, ${pickedLng.toFixed(4)})`
                                    : ` (${t("common.optional")})`}
                            </Label>
                            <div className="relative isolate">
                                <Map
                                    center={centroidOf(
                                        firstNeighborhood.geometry,
                                    )}
                                    zoom={15}
                                    className="h-64 min-h-64"
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
                                    {pickedLat !== null &&
                                        pickedLng !== null && (
                                            <Marker
                                                variant="incident"
                                                position={[pickedLat, pickedLng]}
                                            />
                                        )}
                                    <MapControls
                                        home={
                                            myLocation?.lat != null &&
                                            myLocation?.lng != null
                                                ? [myLocation.lat, myLocation.lng]
                                                : null
                                        }
                                        fitGeometry={
                                            myLocation?.neighborhood
                                                ?.geometry ?? null
                                        }
                                    />
                                </Map>
                            </div>
                        </div>
                    )}
                    <div className="space-y-2">
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
                                    createIncident.isPending ||
                                    missingRequiredFields
                                }
                            >
                                {createIncident.isPending
                                    ? t("pages.incidents.sending")
                                    : t("pages.incidents.report")}
                            </Button>
                        </div>
                        {missingRequiredFields && (
                            <p className="text-muted-foreground text-xs">
                                {t("pages.incidents.requiredFieldsHint")}
                            </p>
                        )}
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
