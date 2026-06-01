import {
    Alert01Icon,
    Building01Icon,
    Calendar01Icon,
    CodeSquareIcon,
    CustomerServiceIcon,
    UserMultipleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { getCurrentUser } from "@workspace/shared/lib/auth";
import { useGlobalStats } from "@workspace/shared/lib/hooks/useStats";
import { Badge } from "@workspace/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { PageHeader } from "@workspace/ui/components/page-header";
import { StatCard } from "@workspace/ui/components/stat-card";

export const Route = createFileRoute("/_app/dashboard/")({
    component: AdminDashboardPage,
});

const STAT_META = [
    { label: "Utilisateurs", key: "users" as const },
    { label: "Incidents ouverts", key: "activeIncidents" as const },
    { label: "Total incidents", key: "incidents" as const },
    { label: "Quartiers", key: "neighborhoods" as const },
];

interface QuickLink {
    to: string;
    label: string;
    desc: string;
    icon: IconSvgElement;
}

const QUICK_LINKS: QuickLink[] = [
    { to: "/users", label: "Utilisateurs", desc: "Rôles et bannissements", icon: UserMultipleIcon },
    { to: "/incidents", label: "Incidents", desc: "Modération et statuts", icon: Alert01Icon },
    { to: "/neighborhoods", label: "Quartiers", desc: "Créer, modifier, supprimer", icon: Building01Icon },
    { to: "/services", label: "Services", desc: "Annuaire de quartier", icon: CustomerServiceIcon },
    { to: "/events", label: "Événements", desc: "Calendrier communautaire", icon: Calendar01Icon },
    { to: "/dsl", label: "Éditeur DSL", desc: "Requêtes en langage naturel", icon: CodeSquareIcon },
];

function AdminDashboardPage() {
    const user = getCurrentUser();
    const { data: stats, isLoading } = useGlobalStats();

    return (
        <div className="p-6">
            <div className="mx-auto max-w-5xl space-y-6">
                <PageHeader
                    title="Tableau de bord"
                    description={user?.email}
                    actions={<Badge variant="secondary">Admin</Badge>}
                />

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {STAT_META.map((meta) => {
                        const value = stats?.[meta.key];
                        return (
                            <StatCard
                                key={meta.key}
                                label={meta.label}
                                loading={isLoading}
                                value={value ?? "—"}
                            />
                        );
                    })}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {QUICK_LINKS.map((item) => (
                        <Link key={item.to} to={item.to} className="group">
                            <Card className="hover:border-primary/40 hover:bg-accent/40 h-full transition-colors">
                                <CardHeader className="flex-row items-center gap-3 space-y-0 pb-2">
                                    <div className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
                                        <HugeiconsIcon
                                            icon={item.icon}
                                            className="size-5"
                                        />
                                    </div>
                                    <CardTitle className="text-base">
                                        {item.label}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground text-sm">
                                        {item.desc}
                                    </p>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
