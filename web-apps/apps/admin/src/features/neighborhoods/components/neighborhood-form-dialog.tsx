import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert01Icon, CheckmarkCircle01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    useCreateNeighborhood,
    useUpdateNeighborhood,
} from "@workspace/shared/lib/hooks/neighborhoods.hooks";
import type { Neighborhood } from "@workspace/shared/lib/types";
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@workspace/ui/components/alert";
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
import { Spinner } from "@workspace/ui/components/spinner";
import { toast } from "sonner";
import { isOverlapError } from "../lib/neighborhood-error";
import { NeighborhoodPolygonEditor } from "./neighborhood-polygon-editor";

export function NeighborhoodFormDialog({
    open,
    initial,
    others,
    onOpenChange,
    onSuccess,
}: {
    open: boolean;
    initial?: Neighborhood;
    others: Neighborhood[];
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}) {
    const { t } = useTranslation();
    const [name, setName] = useState(initial?.name ?? "");
    const [city, setCity] = useState(initial?.city ?? "");
    const [description, setDescription] = useState(initial?.description ?? "");
    const [geometry, setGeometry] = useState<GeoJSON.Polygon | null>(
        (initial?.geometry as GeoJSON.Polygon | undefined) ?? null,
    );

    const createNeighborhood = useCreateNeighborhood();
    const updateNeighborhood = useUpdateNeighborhood();
    const isPending =
        createNeighborhood.isPending || updateNeighborhood.isPending;
    const submitError = initial
        ? updateNeighborhood.error
        : createNeighborhood.error;

    function resetSubmitError() {
        createNeighborhood.reset();
        updateNeighborhood.reset();
    }

    function handleGeometryChange(next: GeoJSON.Polygon | null) {
        resetSubmitError();
        setGeometry(next);
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim()) return;

        const payload = {
            name: name.trim(),
            city: city.trim(),
            description: description.trim() || undefined,
            ...(geometry ? { geometry } : {}),
        };

        if (initial) {
            updateNeighborhood.mutate(
                { id: initial._id, data: payload },
                {
                    onSuccess: () => {
                        toast.success(t("adminPages.neighborhoods.updated"));
                        onSuccess();
                    },
                },
            );
        } else {
            createNeighborhood.mutate(payload, {
                onSuccess: () => {
                    toast.success(t("adminPages.neighborhoods.created"));
                    onSuccess();
                },
            });
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {initial
                            ? t("adminPages.neighborhoods.editTitle")
                            : t("adminPages.neighborhoods.createTitle")}
                    </DialogTitle>
                    <DialogDescription>
                        {t("adminPages.neighborhoods.description")}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="nbh-name">
                                {t("adminPages.neighborhoods.nameLabel")}
                            </Label>
                            <Input
                                id="nbh-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={t(
                                    "adminPages.neighborhoods.namePlaceholder",
                                )}
                                maxLength={100}
                                required
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="nbh-city">
                                {t("adminPages.neighborhoods.cityLabel")}
                            </Label>
                            <Input
                                id="nbh-city"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                placeholder={t(
                                    "adminPages.neighborhoods.cityPlaceholder",
                                )}
                                maxLength={100}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="nbh-desc">
                            {t("incidents.fields.description")}
                        </Label>
                        <Input
                            id="nbh-desc"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t(
                                "adminPages.neighborhoods.descriptionPlaceholder",
                            )}
                            maxLength={500}
                        />
                    </div>

                    {open && (
                        <NeighborhoodPolygonEditor
                            initialGeometry={
                                (initial?.geometry as
                                    | GeoJSON.Polygon
                                    | undefined) ?? undefined
                            }
                            others={others}
                            onChange={handleGeometryChange}
                        />
                    )}

                    {geometry && (
                        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                            <HugeiconsIcon
                                icon={CheckmarkCircle01Icon}
                                className="text-primary size-4"
                            />
                            {t("adminPages.neighborhoods.polygonPoints", {
                                count: geometry.coordinates[0].length - 1,
                            })}
                        </p>
                    )}

                    {!geometry && !initial && (
                        <Alert>
                            <HugeiconsIcon
                                icon={Alert01Icon}
                                className="size-4"
                            />
                            <AlertDescription>
                                {t("adminPages.neighborhoods.noPolygonWarning")}
                            </AlertDescription>
                        </Alert>
                    )}

                    {submitError && (
                        <Alert variant="destructive">
                            <HugeiconsIcon
                                icon={Alert01Icon}
                                className="size-4"
                            />
                            <AlertTitle>
                                {isOverlapError(submitError)
                                    ? t("adminPages.neighborhoods.overlapError")
                                    : initial
                                      ? t(
                                            "adminPages.neighborhoods.updateError",
                                        )
                                      : t(
                                            "adminPages.neighborhoods.createError",
                                        )}
                            </AlertTitle>
                            <AlertDescription>
                                {isOverlapError(submitError)
                                    ? t(
                                          "adminPages.neighborhoods.overlapErrorDetail",
                                      )
                                    : t(
                                          "adminPages.neighborhoods.submitErrorDetail",
                                      )}
                            </AlertDescription>
                        </Alert>
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
                            disabled={isPending || !name.trim() || !city.trim()}
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
