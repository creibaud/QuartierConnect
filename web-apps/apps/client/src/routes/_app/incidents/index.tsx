import { useState } from "react";
import { Alert01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { centroidOf } from "@workspace/shared/lib/geo";
import {
    useCreateIncident,
    useInfiniteIncidents,
} from "@workspace/shared/lib/hooks/incidents.hooks";
import { useNeighborhoods } from "@workspace/shared/lib/hooks/neighborhoods.hooks";
import { Badge } from "@workspace/ui/components/badge";
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
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@workspace/ui/components/empty";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@workspace/ui/components/select";
import {
    Map,
    MapClickHandler,
    MapControls,
    Marker,
    NeighborhoodPolygon,
} from "@workspace/ui/components/map";
import { useMyLocation } from "@/features/onboarding/hooks/address.hooks";
import { PageHeader } from "@workspace/ui/components/page-header";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Textarea } from "@workspace/ui/components/textarea";
import { toast } from "sonner";

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
    open: "default",
    in_progress: "secondary",
    resolved: "outline",
};

export const Route = createFileRoute("/_app/incidents/")({
    component: IncidentsPage,
});

function IncidentsPage() {
    const { t } = useTranslation();
    const [createOpen, setCreateOpen] = useState(false);
    const statusLabels: Record<string, string> = {
        open: t("incidents.status.open"),
        in_progress: t("incidents.status.in_progress"),
        resolved: t("incidents.status.resolved"),
    };
    const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage } =
        useInfiniteIncidents();
    const incidents = data?.pages.flat() ?? [];
    const { data: neighborhoods } = useNeighborhoods();
    const { data: myLocation } = useMyLocation();
    const firstNeighborhood = neighborhoods?.find((n) => n.geometry);
    const incidentsWithCoords = incidents.filter(
        (i) => i.lat !== null && i.lng !== null,
    );

    return (
        <div className="p-6 md:p-8">
            <div className="mx-auto flex max-w-7xl flex-col gap-6">
                <PageHeader
                    title={t("incidents.title")}
                    description={t("pages.incidents.description")}
                    actions={
                        <Button onClick={() => setCreateOpen(true)}>
                            <HugeiconsIcon icon={Alert01Icon} />
                            {t("incidents.new")}
                        </Button>
                    }
                />

                {firstNeighborhood?.geometry && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                {t("pages.incidents.mapTitle")}
                            </CardTitle>
                            <CardDescription>
                                {t("pages.incidents.locatedCount", {
                                    count: incidentsWithCoords.length,
                                })}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="relative isolate">
                                <Map
                                    center={centroidOf(firstNeighborhood.geometry)}
                                    zoom={14}
                                    className="h-[400px] min-h-[400px] w-full"
                                >
                                    {neighborhoods?.map((n) =>
                                        n.geometry ? (
                                            <NeighborhoodPolygon
                                                key={n._id}
                                                geometry={n.geometry}
                                                label={n.name}
                                            />
                                        ) : null,
                                    )}
                                    {incidentsWithCoords.map((inc) => (
                                        <Marker
                                            key={inc.id}
                                            variant="incident"
                                            position={[inc.lat!, inc.lng!]}
                                            popup={
                                                <div className="space-y-1">
                                                    <p className="font-medium">
                                                        {inc.title}
                                                    </p>
                                                    <p className="text-xs">
                                                        {t(
                                                            "pages.incidents.statusLabel",
                                                            {
                                                                status:
                                                                    statusLabels[
                                                                        inc.status
                                                                    ] ?? inc.status,
                                                            },
                                                        )}
                                                    </p>
                                                </div>
                                            }
                                        />
                                    ))}
                                    <MapControls
                                        home={
                                            myLocation?.lat != null &&
                                            myLocation?.lng != null
                                                ? [myLocation.lat, myLocation.lng]
                                                : null
                                        }
                                        fitGeometry={
                                            myLocation?.neighborhood?.geometry ??
                                            null
                                        }
                                    />
                                </Map>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <DataState
                    loading={isLoading}
                    error={isError ? true : undefined}
                    isEmpty={incidents.length === 0}
                    onRetry={() => refetch()}
                    skeleton={
                        <div className="space-y-3">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <Skeleton
                                    key={i}
                                    className="h-20 w-full rounded-lg"
                                />
                            ))}
                        </div>
                    }
                    empty={
                        <Empty>
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <HugeiconsIcon icon={Alert01Icon} />
                                </EmptyMedia>
                                <EmptyTitle>
                                    {t("pages.incidents.emptyTitle")}
                                </EmptyTitle>
                                <EmptyDescription>
                                    {t("pages.incidents.emptyDescription")}
                                </EmptyDescription>
                            </EmptyHeader>
                            <EmptyContent>
                                <Button onClick={() => setCreateOpen(true)}>
                                    <HugeiconsIcon icon={Alert01Icon} />
                                    {t("incidents.new")}
                                </Button>
                            </EmptyContent>
                        </Empty>
                    }
                >
                    <div className="space-y-3">
                        {incidents.map((incident) => (
                            <Link
                                key={incident.id}
                                to="/incidents/$id"
                                params={{ id: incident.id }}
                            >
                                <Card className="hover:bg-muted/50 cursor-pointer transition-colors">
                                    <CardHeader className="pb-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <CardTitle className="text-sm font-medium">
                                                {incident.title}
                                            </CardTitle>
                                            <Badge
                                                variant={
                                                    STATUS_VARIANTS[
                                                        incident.status
                                                    ] ?? "outline"
                                                }
                                            >
                                                {statusLabels[
                                                    incident.status
                                                ] ?? incident.status}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    {incident.description && (
                                        <CardContent className="pt-0">
                                            <p className="text-muted-foreground line-clamp-2 text-sm">
                                                {incident.description}
                                            </p>
                                        </CardContent>
                                    )}
                                </Card>
                            </Link>
                        ))}

                        {hasNextPage && (
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => fetchNextPage()}
                            >
                                {t("common.loadMore")}
                            </Button>
                        )}
                    </div>
                </DataState>

                <CreateIncidentDialog
                    open={createOpen}
                    onOpenChange={setCreateOpen}
                    onSuccess={() => setCreateOpen(false)}
                />
            </div>
        </div>
    );
}

function CreateIncidentDialog({
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
    const createIncident = useCreateIncident();
    const { data: neighborhoods } = useNeighborhoods();
    const { data: myLocation } = useMyLocation();
    const firstNeighborhood = neighborhoods?.find((n) => n.geometry);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!title.trim()) return;
        createIncident.mutate(
            {
                title: title.trim(),
                description: description.trim() || undefined,
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
                    onSuccess();
                },
                onError: () =>
                    toast.error(t("pages.incidents.reportError")),
            },
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t("incidents.new")}</DialogTitle>
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
                            {t("incidents.fields.description")}
                        </Label>
                        <Textarea
                            id="incident-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t(
                                "pages.incidents.descriptionPlaceholder",
                            )}
                            rows={3}
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
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {(
                                    [
                                        "neighborhood",
                                        "reporting",
                                        "bug",
                                    ] as const
                                ).map((c) => (
                                    <SelectItem key={c} value={c}>
                                        {t(
                                            `pages.incidents.categories.${c}`,
                                        )}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
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
                                    center={centroidOf(firstNeighborhood.geometry)}
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
                                    {pickedLat !== null && pickedLng !== null && (
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
                                            myLocation?.neighborhood?.geometry ??
                                            null
                                        }
                                    />
                                </Map>
                            </div>
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
                            disabled={createIncident.isPending || !title.trim()}
                        >
                            {createIncident.isPending
                                ? t("pages.incidents.sending")
                                : t("pages.incidents.report")}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
