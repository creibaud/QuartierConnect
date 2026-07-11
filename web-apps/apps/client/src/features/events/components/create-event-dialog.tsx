import { useState } from "react";
import { useTranslation } from "react-i18next";
import { pointInPolygon } from "@workspace/shared/lib/geo";
import { useCreateEvent } from "@workspace/shared/lib/hooks/events.hooks";
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
import { Textarea } from "@workspace/ui/components/textarea";
import { toast } from "sonner";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import { useMyLocation } from "@/features/onboarding/hooks/address.hooks";

export function CreateEventDialog({
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
    const [date, setDate] = useState("");
    const [address, setAddress] = useState("");
    const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(
        null,
    );
    const [category, setCategory] = useState("other");
    const { data: myLocation } = useMyLocation();
    const createEvent = useCreateEvent();

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!title.trim() || !date) return;
        createEvent.mutate(
            {
                title: title.trim(),
                description: description.trim() || undefined,
                date,
                category,
                address: address.trim() || undefined,
                location: picked
                    ? {
                          type: "Point" as const,
                          coordinates: [picked.lng, picked.lat] as [
                              number,
                              number,
                          ],
                      }
                    : undefined,
            },
            {
                onSuccess: () => {
                    toast.success(t("pages.events.createSuccess"));
                    setTitle("");
                    setDescription("");
                    setDate("");
                    setAddress("");
                    setPicked(null);
                    setCategory("other");
                    onSuccess();
                },
                onError: () => toast.error(t("pages.events.createError")),
            },
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t("pages.events.create")}</DialogTitle>
                    <DialogDescription>
                        {t("pages.events.createDescription")}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="evt-title">
                            {t("pages.events.titleRequired")}
                        </Label>
                        <Input
                            id="evt-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={t("pages.events.titlePlaceholder")}
                            maxLength={255}
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="evt-date">
                                {t("pages.events.dateRequired")}
                            </Label>
                            <Input
                                id="evt-date"
                                type="datetime-local"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="evt-address">
                                {t("pages.events.location")}
                            </Label>
                            <AddressAutocomplete
                                id="evt-address"
                                value={address}
                                onChange={(text) => {
                                    setAddress(text);
                                    setPicked(null);
                                }}
                                onSelect={(s) => {
                                    setAddress(s.label);
                                    setPicked({ lat: s.lat, lng: s.lng });
                                }}
                                placeholder={t(
                                    "pages.events.locationPlaceholder",
                                )}
                            />
                            {picked &&
                                myLocation?.neighborhood?.geometry &&
                                !pointInPolygon(
                                    picked.lat,
                                    picked.lng,
                                    myLocation.neighborhood.geometry,
                                ) && (
                                    <p className="text-xs text-amber-600 dark:text-amber-500">
                                        {t("address.outsideQuartier")}
                                    </p>
                                )}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="evt-desc">
                            {t("pages.events.descriptionLabel")}
                        </Label>
                        <Textarea
                            id="evt-desc"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
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
                        <Button
                            type="submit"
                            disabled={
                                createEvent.isPending || !title.trim() || !date
                            }
                        >
                            {createEvent.isPending
                                ? t("common.creating")
                                : t("common.create")}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
