import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Add01Icon,
    CustomerServiceIcon,
    Delete01Icon,
    Edit01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute } from "@tanstack/react-router";
import {
    centroidOf,
    latLngToPoint,
    pointToLatLng,
} from "@workspace/shared/lib/geo";
import { useNeighborhoods } from "@workspace/shared/lib/hooks/neighborhoods.hooks";
import {
    useCreateService,
    useDeleteService,
    useServices,
    useUpdateService,
} from "@workspace/shared/lib/hooks/services.hooks";
import type { Neighborhood, Service } from "@workspace/shared/lib/types";
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
    Map,
    MapClickHandler,
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@workspace/ui/components/table";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@workspace/ui/components/tabs";
import { Textarea } from "@workspace/ui/components/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/services/")({
    component: AdminServicesPage,
});

function AdminServicesPage() {
    const { t } = useTranslation();
    const [createOpen, setCreateOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Service | null>(null);

    const {
        data: servicesData,
        isLoading,
        isError,
    } = useServices({ limit: 100 });
    const { data: neighborhoodsData } = useNeighborhoods(100);
    const services = servicesData ?? [];
    const neighborhoods = neighborhoodsData ?? [];
    const deleteService = useDeleteService();

    const nbhMap = Object.fromEntries(
        neighborhoods.map((n) => [n._id, n.name]),
    );

    const [categoryFilter, setCategoryFilter] = useState("all");
    const categories = Array.from(
        new Set(services.map((svc) => svc.category)),
    ).sort();
    const filteredServices = services.filter(
        (svc) => categoryFilter === "all" || svc.category === categoryFilter,
    );

    function handleDelete(id: string) {
        deleteService.mutate(id, {
            onSuccess: () => toast.success(t("adminPages.services.deleted")),
            onError: () => toast.error(t("adminPages.common.deleteError")),
        });
    }

    return (
        <div className="p-6">
            <div className="mx-auto max-w-6xl space-y-6">
                <PageHeader
                    title={t("adminPages.services.title")}
                    description={t("adminPages.services.description")}
                    actions={
                        <Button onClick={() => setCreateOpen(true)}>
                            <HugeiconsIcon icon={Add01Icon} />
                            {t("adminPages.common.add")}
                        </Button>
                    }
                />

                <Tabs defaultValue="list" className="gap-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <TabsList>
                            <TabsTrigger value="list">
                                {t("adminPages.common.listTab")}
                            </TabsTrigger>
                            <TabsTrigger value="map">
                                {t("adminPages.common.mapTab")}
                            </TabsTrigger>
                        </TabsList>
                        {categories.length > 0 && (
                            <Select
                                value={categoryFilter}
                                onValueChange={setCategoryFilter}
                            >
                                <SelectTrigger className="w-full sm:w-56">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        {t("adminPages.services.allCategories")}
                                    </SelectItem>
                                    {categories.map((category) => (
                                        <SelectItem
                                            key={category}
                                            value={category}
                                        >
                                            {category}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                    <TabsContent value="list">
                        <DataState
                            loading={isLoading}
                            error={isError ? true : undefined}
                            isEmpty={filteredServices.length === 0}
                            skeleton={
                                <div className="flex flex-col gap-2">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <Skeleton
                                            key={i}
                                            className="h-12 w-full rounded"
                                        />
                                    ))}
                                </div>
                            }
                            empty={
                                <Empty>
                                    <EmptyHeader>
                                        <EmptyMedia variant="icon">
                                            <HugeiconsIcon
                                                icon={CustomerServiceIcon}
                                            />
                                        </EmptyMedia>
                                        <EmptyTitle>
                                            {t(
                                                "adminPages.services.emptyTitle",
                                            )}
                                        </EmptyTitle>
                                        <EmptyDescription>
                                            {t(
                                                "adminPages.services.emptyDescription",
                                            )}
                                        </EmptyDescription>
                                    </EmptyHeader>
                                    <EmptyContent>
                                        <Button
                                            onClick={() => setCreateOpen(true)}
                                        >
                                            <HugeiconsIcon icon={Add01Icon} />
                                            {t("adminPages.services.addCta")}
                                        </Button>
                                    </EmptyContent>
                                </Empty>
                            }
                        >
                            <div className="bg-card rounded-lg border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>
                                                {t("adminPages.common.name")}
                                            </TableHead>
                                            <TableHead>
                                                {t(
                                                    "adminPages.services.category",
                                                )}
                                            </TableHead>
                                            <TableHead>
                                                {t(
                                                    "incidents.fields.neighborhood",
                                                )}
                                            </TableHead>
                                            <TableHead className="text-right">
                                                {t("adminPages.common.actions")}
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredServices.map((svc) => (
                                            <TableRow key={svc._id}>
                                                <TableCell className="py-2 font-medium">
                                                    {svc.title}
                                                </TableCell>
                                                <TableCell className="py-2">
                                                    <Badge variant="secondary">
                                                        {svc.category}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground py-2 text-sm">
                                                    {svc.neighborhoodId
                                                        ? (nbhMap[
                                                              svc.neighborhoodId
                                                          ] ?? "—")
                                                        : "—"}
                                                </TableCell>
                                                <TableCell className="py-2 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-8 text-xs"
                                                            onClick={() =>
                                                                setEditTarget(
                                                                    svc,
                                                                )
                                                            }
                                                        >
                                                            <HugeiconsIcon
                                                                icon={
                                                                    Edit01Icon
                                                                }
                                                            />
                                                            {t(
                                                                "adminPages.common.edit",
                                                            )}
                                                        </Button>
                                                        <AlertDialog>
                                                            <AlertDialogTrigger
                                                                asChild
                                                            >
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="text-destructive hover:text-destructive h-8 text-xs"
                                                                    disabled={
                                                                        deleteService.isPending
                                                                    }
                                                                >
                                                                    <HugeiconsIcon
                                                                        icon={
                                                                            Delete01Icon
                                                                        }
                                                                    />
                                                                    {t(
                                                                        "common.delete",
                                                                    )}
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>
                                                                        {t(
                                                                            "adminPages.services.deleteConfirmTitle",
                                                                        )}
                                                                    </AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        {t(
                                                                            "adminPages.services.deleteConfirmDescription",
                                                                            {
                                                                                title: svc.title,
                                                                            },
                                                                        )}
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>
                                                                        {t(
                                                                            "common.cancel",
                                                                        )}
                                                                    </AlertDialogCancel>
                                                                    <AlertDialogAction
                                                                        variant="destructive"
                                                                        onClick={() =>
                                                                            handleDelete(
                                                                                svc._id,
                                                                            )
                                                                        }
                                                                    >
                                                                        {t(
                                                                            "common.delete",
                                                                        )}
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </DataState>
                    </TabsContent>
                    <TabsContent value="map">
                        <ServicesMap
                            services={filteredServices}
                            neighborhoods={neighborhoods}
                        />
                    </TabsContent>
                </Tabs>

                <ServiceDialog
                    open={createOpen}
                    neighborhoods={neighborhoods}
                    onOpenChange={setCreateOpen}
                    onSuccess={() => setCreateOpen(false)}
                />

                {editTarget && (
                    <ServiceDialog
                        key={editTarget._id}
                        open
                        initial={editTarget}
                        neighborhoods={neighborhoods}
                        onOpenChange={(open) => {
                            if (!open) setEditTarget(null);
                        }}
                        onSuccess={() => setEditTarget(null)}
                    />
                )}
            </div>
        </div>
    );
}

function ServicesMap({
    services,
    neighborhoods,
}: {
    services: Service[];
    neighborhoods: Neighborhood[];
}) {
    const firstNeighborhood = neighborhoods.find((n) => n.geometry);
    const servicesWithCoords = services.filter((s) => s.location);
    const center: [number, number] = firstNeighborhood?.geometry
        ? centroidOf(firstNeighborhood.geometry)
        : [48.8566, 2.3522];
    return (
        <Map center={center} zoom={13} className="h-[600px] w-full">
            {neighborhoods.map((n) =>
                n.geometry ? (
                    <NeighborhoodPolygon
                        key={n._id}
                        geometry={n.geometry}
                        label={n.name}
                    />
                ) : null,
            )}
            <MarkerCluster>
                {servicesWithCoords.map((s) => (
                    <Marker
                        key={s._id}
                        variant="service"
                        position={pointToLatLng(s.location!)}
                        popup={
                            <div className="space-y-1">
                                <p className="font-medium">{s.title}</p>
                                <p className="text-xs">{s.category}</p>
                            </div>
                        }
                    />
                ))}
            </MarkerCluster>
        </Map>
    );
}

function ServiceDialog({
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

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim() || !category.trim()) return;
        const location =
            pickedLat !== null && pickedLng !== null
                ? latLngToPoint(pickedLat, pickedLng)
                : undefined;
        const payload = {
            title: name.trim(),
            category: category.trim(),
            type,
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
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {initial
                            ? t("adminPages.services.editTitle")
                            : t("adminPages.services.addCta")}
                    </DialogTitle>
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
                            <Input
                                id="svc-category"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                placeholder={t(
                                    "adminPages.services.categoryPlaceholder",
                                )}
                                maxLength={100}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("adminPages.services.typeLabel")}</Label>
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
                    </div>
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
                            onChange={(e) =>
                                setPointsMultiplier(e.target.value)
                            }
                            placeholder="1"
                        />
                        <p className="text-muted-foreground text-xs">
                            {t("adminPages.services.pointsMultiplierHint")}
                        </p>
                    </div>
                    {neighborhoods.length > 0 && (
                        <div className="space-y-2">
                            <Label>{t("incidents.fields.neighborhood")}</Label>
                            <Select
                                value={neighborhoodId}
                                onValueChange={setNeighborhoodId}
                            >
                                <SelectTrigger>
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
                            <Label>
                                {t("adminPages.services.positionLabel")}
                                {pickedLat !== null && pickedLng !== null
                                    ? ` (${pickedLat.toFixed(4)}, ${pickedLng.toFixed(4)})`
                                    : ` ${t("adminPages.services.optional")}`}
                            </Label>
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
                                isPending || !name.trim() || !category.trim()
                            }
                        >
                            {isPending
                                ? "…"
                                : initial
                                  ? t("common.save")
                                  : t("adminPages.common.create")}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
