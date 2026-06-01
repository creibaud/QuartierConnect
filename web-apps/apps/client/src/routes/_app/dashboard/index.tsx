import { useEffect, useState } from "react";
import {
    Alert01Icon,
    Calendar01Icon,
    Coins01Icon,
    ComputerIcon,
    Copy01Icon,
    CustomerServiceIcon,
    Location01Icon,
    Message01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { apiPost } from "@workspace/shared/lib/api";
import { getCurrentUser } from "@workspace/shared/lib/auth";
import { centroidOf } from "@workspace/shared/lib/geo";
import { useNeighborhoods } from "@workspace/shared/lib/hooks/neighborhoods.hooks";
import { usePointBalance } from "@workspace/shared/lib/hooks/points.hooks";
import {
    Map,
    NeighborhoodPolygon,
    UserLocation,
} from "@workspace/ui/components/map";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@workspace/ui/components/dialog";
import { PageHeader } from "@workspace/ui/components/page-header";
import { Spinner } from "@workspace/ui/components/spinner";
import { StatCard } from "@workspace/ui/components/stat-card";
import { toast } from "sonner";

interface SsoTokenResponse {
    ssoToken: string;
    expiresAt: string;
    expiresIn: number;
}

const ROLE_LABELS: Record<string, string> = {
    resident: "Résident",
    moderator: "Modérateur",
    admin: "Administrateur",
};

interface QuickLink {
    to: string;
    label: string;
    icon: IconSvgElement;
}

const QUICK_LINKS: QuickLink[] = [
    { to: "/incidents", label: "Incidents", icon: Alert01Icon },
    { to: "/services", label: "Services", icon: CustomerServiceIcon },
    { to: "/events", label: "Événements", icon: Calendar01Icon },
    { to: "/contracts", label: "Contrats", icon: Coins01Icon },
    { to: "/messages", label: "Messages", icon: Message01Icon },
];

export const Route = createFileRoute("/_app/dashboard/")({
    component: DashboardPage,
});

function DashboardPage() {
    const user = getCurrentUser();
    const { data: pointData, isLoading: pointsLoading } = usePointBalance();
    const { data: neighborhoods } = useNeighborhoods();
    const primaryNeighborhood = neighborhoods?.find((n) => n.geometry);

    const [ssoToken, setSsoToken] = useState<SsoTokenResponse | null>(null);
    const [ssoLoading, setSsoLoading] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [ssoDialogOpen, setSsoDialogOpen] = useState(false);

    useEffect(() => {
        if (!ssoToken) return;
        const expiresAt = new Date(ssoToken.expiresAt).getTime();
        const tick = () => {
            const remaining = Math.max(
                0,
                Math.round((expiresAt - Date.now()) / 1000),
            );
            setCountdown(remaining);
            if (remaining === 0) setSsoToken(null);
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [ssoToken]);

    async function handleGenerateSsoToken() {
        setSsoLoading(true);
        try {
            const data = await apiPost<SsoTokenResponse>("/auth/sso/generate", {
                surface: "java-desktop",
            });
            setSsoToken(data);
            setCountdown(data.expiresIn);
            setSsoDialogOpen(true);
        } catch {
            toast.error("Impossible de générer le token SSO");
        } finally {
            setSsoLoading(false);
        }
    }

    function handleCopySsoToken() {
        if (!ssoToken) return;
        navigator.clipboard.writeText(ssoToken.ssoToken);
        toast.success("Token copié dans le presse-papier");
    }

    function handleCloseDialog() {
        setSsoDialogOpen(false);
        setSsoToken(null);
    }

    if (!user) return null;

    const roleLabel = ROLE_LABELS[user.role] ?? user.role;

    return (
        <div className="p-6 md:p-8">
            <div className="mx-auto max-w-5xl space-y-6">
                <PageHeader
                    title="Bonjour"
                    description={user.email}
                    actions={<Badge variant="secondary">{roleLabel}</Badge>}
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <StatCard
                        label="Vos points"
                        value={pointData?.balance ?? "—"}
                        hint="Points de participation"
                        loading={pointsLoading}
                    />
                    <StatCard
                        label="Quartiers cartographiés"
                        value={neighborhoods?.length ?? "—"}
                        hint="Autour de chez vous"
                    />
                </div>

                {primaryNeighborhood?.geometry && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <HugeiconsIcon
                                    icon={Location01Icon}
                                    className="text-primary size-5"
                                />
                                Mon quartier — {primaryNeighborhood.name}
                            </CardTitle>
                            <CardDescription>
                                {neighborhoods && neighborhoods.length > 1
                                    ? `${neighborhoods.length} quartiers cartographiés`
                                    : "Plan du quartier"}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Map
                                center={centroidOf(primaryNeighborhood.geometry)}
                                zoom={13}
                                className="h-80 min-h-80 w-full"
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
                                <UserLocation
                                    fallbackCenter={centroidOf(
                                        primaryNeighborhood.geometry,
                                    )}
                                />
                            </Map>
                        </CardContent>
                    </Card>
                )}

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                    {QUICK_LINKS.map((item) => (
                        <Link key={item.to} to={item.to} className="group">
                            <Card className="hover:border-primary/40 hover:bg-accent/40 h-full transition-colors">
                                <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
                                    <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
                                        <HugeiconsIcon
                                            icon={item.icon}
                                            className="size-5"
                                        />
                                    </div>
                                    <p className="text-sm font-medium">
                                        {item.label}
                                    </p>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <HugeiconsIcon
                                icon={ComputerIcon}
                                className="text-primary size-5"
                            />
                            Application desktop
                        </CardTitle>
                        <CardDescription>
                            Générez un token SSO pour vous connecter à
                            l&apos;application Java sans ressaisir vos
                            identifiants.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            variant="outline"
                            onClick={handleGenerateSsoToken}
                            disabled={ssoLoading}
                        >
                            {ssoLoading ? <Spinner className="mr-2" /> : null}
                            {ssoLoading
                                ? "Génération…"
                                : "Générer un token SSO"}
                        </Button>
                    </CardContent>
                </Card>

                <Dialog open={ssoDialogOpen} onOpenChange={handleCloseDialog}>
                    {ssoToken && (
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Token SSO</DialogTitle>
                                <DialogDescription>
                                    Valide{" "}
                                    {countdown > 0
                                        ? `encore ${countdown}s`
                                        : "(expiré)"}
                                    . Usage unique.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className="bg-muted rounded-lg p-3 font-mono text-xs break-all select-all">
                                    {ssoToken.ssoToken}
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        className="flex-1"
                                        onClick={handleCopySsoToken}
                                        disabled={countdown === 0}
                                    >
                                        <HugeiconsIcon icon={Copy01Icon} />
                                        Copier le token
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={handleCloseDialog}
                                    >
                                        Fermer
                                    </Button>
                                </div>
                                {countdown <= 60 && countdown > 0 && (
                                    <p className="text-destructive text-xs">
                                        Le token expire dans {countdown}{" "}
                                        secondes.
                                    </p>
                                )}
                            </div>
                        </DialogContent>
                    )}
                </Dialog>
            </div>
        </div>
    );
}
