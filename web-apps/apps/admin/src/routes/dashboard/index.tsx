import {
    createFileRoute,
    Link,
    redirect,
    useNavigate,
} from "@tanstack/react-router";
import { ensureAuthenticated } from "@workspace/shared/lib/api";
import { clearTokens, getCurrentUser } from "@workspace/shared/lib/auth";
import { useGlobalStats } from "@workspace/shared/lib/hooks/useStats";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";

export const Route = createFileRoute("/dashboard/")({
    beforeLoad: async () => {
        const user = await ensureAuthenticated();
        if (!user)
            throw redirect({ to: "/login", search: { forbidden: false } });
        if (user.role !== "admin")
            throw redirect({ to: "/login", search: { forbidden: true } });
    },
    component: AdminDashboardPage,
});

const STAT_META = [
    { label: "Utilisateurs", key: "users" as const, href: "/users" },
    {
        label: "Incidents ouverts",
        key: "activeIncidents" as const,
        href: "/incidents",
    },
    { label: "Total incidents", key: "incidents" as const, href: "/incidents" },
    {
        label: "Quartiers",
        key: "neighborhoods" as const,
        href: "/neighborhoods",
    },
];

function AdminDashboardPage() {
    const navigate = useNavigate();
    const user = getCurrentUser();
    const { data: stats, isLoading } = useGlobalStats();

    function handleLogout() {
        clearTokens();
        navigate({ to: "/login", search: { forbidden: false } });
    }

    return (
        <div className="min-h-screen bg-zinc-50 p-6 dark:bg-zinc-950">
            <div className="mx-auto max-w-4xl space-y-6">
                <header className="flex items-center justify-between">
                    <div className="space-y-1">
                        <h1 className="text-xl font-semibold">
                            QuartierConnect — Administration
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            {user?.email}{" "}
                            <Badge variant="secondary" className="ml-1">
                                Admin
                            </Badge>
                        </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleLogout}>
                        Déconnexion
                    </Button>
                </header>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {STAT_META.map((meta) => (
                        <Card key={meta.label}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-muted-foreground text-sm font-medium">
                                    {meta.label}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <Skeleton className="h-9 w-16" />
                                ) : stats?.[meta.key] !== null &&
                                  stats?.[meta.key] !== undefined ? (
                                    <p className="text-3xl font-bold">
                                        {stats[meta.key]}
                                    </p>
                                ) : (
                                    <p className="text-muted-foreground text-2xl font-bold">
                                        —
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[
                        {
                            to: "/users",
                            label: "Utilisateurs",
                            desc: "Gérer les rôles et bannissements",
                        },
                        {
                            to: "/incidents",
                            label: "Incidents",
                            desc: "Modération et changement de statut",
                        },
                        {
                            to: "/neighborhoods",
                            label: "Quartiers",
                            desc: "Créer, modifier, supprimer",
                        },
                        {
                            to: "/services",
                            label: "Services",
                            desc: "Annuaire des services de quartier",
                        },
                        {
                            to: "/events",
                            label: "Événements",
                            desc: "Calendrier communautaire",
                        },
                        {
                            to: "/dsl",
                            label: "Éditeur DSL",
                            desc: "Requêtes en langage naturel",
                        },
                    ].map(({ to, label, desc }) => (
                        <Card key={to}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base">
                                    {label}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground mb-3 text-xs">
                                    {desc}
                                </p>
                                <Link to={to}>
                                    <Button variant="outline" size="sm">
                                        Ouvrir
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
