import { useEffect, useState } from "react";
import {
    createFileRoute,
    Link,
    redirect,
    useNavigate,
} from "@tanstack/react-router";
import { apiPost, ensureAuthenticated } from "@workspace/shared/lib/api";
import { clearTokens, getCurrentUser } from "@workspace/shared/lib/auth";
import { usePointBalance } from "@workspace/shared/lib/hooks/points.hooks";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
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
import { Spinner } from "@workspace/ui/components/spinner";
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

export const Route = createFileRoute("/dashboard/")({
    beforeLoad: async () => {
        const user = await ensureAuthenticated();
        if (!user) throw redirect({ to: "/login" });
    },
    component: DashboardPage,
});

function DashboardPage() {
    const navigate = useNavigate();
    const user = getCurrentUser();
    const { data: pointData, isLoading: pointsLoading } = usePointBalance();

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

    async function handleLogout() {
        await apiPost("/auth/logout", {}).catch(() => undefined);
        clearTokens();
        navigate({ to: "/login" });
    }

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

    const initials = user.email.slice(0, 2).toUpperCase();

    return (
        <div className="min-h-screen bg-zinc-50 p-6 dark:bg-zinc-950">
            <div className="mx-auto max-w-2xl space-y-6">
                <header className="flex items-center justify-between">
                    <h1 className="text-xl font-semibold">QuartierConnect</h1>
                    <Button variant="outline" size="sm" onClick={handleLogout}>
                        Déconnexion
                    </Button>
                </header>

                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <Avatar className="h-14 w-14">
                                <AvatarFallback className="text-lg">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                            <div className="space-y-1">
                                <CardTitle>{user.email}</CardTitle>
                                <CardDescription>
                                    <Badge variant="secondary">
                                        {ROLE_LABELS[user.role] ?? user.role}
                                    </Badge>
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground text-sm">
                            Bienvenue sur votre tableau de bord. Connecté avec
                            l&apos;authentification à deux facteurs.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Vos points</CardTitle>
                        <CardDescription>
                            Solde de points de participation
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {pointsLoading ? (
                            <Spinner />
                        ) : pointData !== undefined ? (
                            <p className="text-3xl font-bold">
                                {pointData.balance}
                            </p>
                        ) : (
                            <p className="text-muted-foreground text-sm">
                                Solde indisponible
                            </p>
                        )}
                    </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                        { to: "/incidents", label: "Incidents" },
                        { to: "/services", label: "Services" },
                        { to: "/events", label: "Événements" },
                        { to: "/contracts", label: "Contrats" },
                    ].map(({ to, label }) => (
                        <Link key={to} to={to}>
                            <Card className="hover:bg-muted/50 cursor-pointer text-center transition-colors">
                                <CardContent className="pt-4 pb-4">
                                    <p className="text-sm font-medium">
                                        {label}
                                    </p>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">
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
