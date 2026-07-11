import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
    useCreateEvent,
    useUpdateEvent,
} from "@workspace/shared/lib/hooks/events.hooks";
import type { Event, Neighborhood } from "@workspace/shared/lib/types";
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@workspace/ui/components/select";
import { Spinner } from "@workspace/ui/components/spinner";
import { Textarea } from "@workspace/ui/components/textarea";
import { toast } from "sonner";
import { toLocalDatetime } from "../lib/event-datetime";

export function EventFormDialog({
    open,
    initial,
    neighborhoods,
    onOpenChange,
    onSuccess,
}: {
    open: boolean;
    initial?: Event;
    neighborhoods: Neighborhood[];
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}) {
    const { t } = useTranslation();

    const [title, setTitle] = useState(initial?.title ?? "");
    const [date, setDate] = useState(toLocalDatetime(initial?.date));
    const [address, setAddress] = useState(initial?.address ?? "");
    const [category, setCategory] = useState(initial?.category ?? "");
    const [description, setDescription] = useState(initial?.description ?? "");
    const [neighborhoodId, setNeighborhoodId] = useState(
        initial?.neighborhoodId ?? "",
    );
    const createEvent = useCreateEvent();
    const updateEvent = useUpdateEvent();

    const isPending = createEvent.isPending || updateEvent.isPending;

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!title.trim() || !date || !category) return;
        const payload = {
            title: title.trim(),
            date: new Date(date).toISOString(),
            category,
            address: address.trim() || undefined,
            description: description.trim() || undefined,
            neighborhoodId: neighborhoodId || undefined,
        };
        if (initial) {
            updateEvent.mutate(
                { id: initial._id, data: payload },
                {
                    onSuccess: () => {
                        toast.success(t("adminPages.events.updated"));
                        onSuccess();
                    },
                    onError: () =>
                        toast.error(t("adminPages.common.saveError")),
                },
            );
        } else {
            createEvent.mutate(payload, {
                onSuccess: () => {
                    toast.success(t("adminPages.events.created"));
                    onSuccess();
                },
                onError: () => toast.error(t("adminPages.common.saveError")),
            });
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {initial
                            ? t("adminPages.events.editTitle")
                            : t("adminPages.events.createTitle")}
                    </DialogTitle>
                    <DialogDescription>
                        {t("adminPages.events.description")}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="evt-title">
                            {t("adminPages.events.titleLabel")}
                        </Label>
                        <Input
                            id="evt-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={t(
                                "adminPages.events.titlePlaceholder",
                            )}
                            maxLength={255}
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="evt-date">
                                {t("adminPages.events.dateLabel")}
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
                                {t("adminPages.events.placeLabel")}
                            </Label>
                            <Input
                                id="evt-address"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder={t(
                                    "adminPages.events.placePlaceholder",
                                )}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="evt-category">
                            {t("adminPages.events.categoryLabel")}
                        </Label>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger id="evt-category">
                                <SelectValue
                                    placeholder={t(
                                        "adminPages.events.categoryPlaceholder",
                                    )}
                                />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="culture">
                                    {t("adminPages.events.categories.culture")}
                                </SelectItem>
                                <SelectItem value="sport">
                                    {t("adminPages.events.categories.sport")}
                                </SelectItem>
                                <SelectItem value="community">
                                    {t(
                                        "adminPages.events.categories.community",
                                    )}
                                </SelectItem>
                                <SelectItem value="education">
                                    {t(
                                        "adminPages.events.categories.education",
                                    )}
                                </SelectItem>
                                <SelectItem value="other">
                                    {t("adminPages.events.categories.other")}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {neighborhoods.length > 0 && (
                        <div className="space-y-2">
                            <Label htmlFor="evt-neighborhood">
                                {t("incidents.fields.neighborhood")}
                            </Label>
                            <Select
                                value={neighborhoodId}
                                onValueChange={setNeighborhoodId}
                            >
                                <SelectTrigger id="evt-neighborhood">
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
                        <Label htmlFor="evt-desc">
                            {t("incidents.fields.description")}
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
                                isPending || !title.trim() || !date || !category
                            }
                        >
                            {isPending && <Spinner className="mr-2" />}
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
