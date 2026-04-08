import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ensureAuthenticated } from "@workspace/shared/lib/api";
import {
    useInfiniteUsers,
    useUpdateUserRole,
} from "@workspace/shared/lib/hooks/useAdminUsers";
import type { User } from "@workspace/shared/lib/types";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
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
import { toast } from "sonner";

const ROLE_LABELS: Record<string, string> = {
    resident: "Résident",
    moderator: "Modérateur",
    admin: "Administrateur",
    banned: "Banni",
};

const ROLE_VARIANTS: Record<
    string,
    "default" | "secondary" | "outline" | "destructive"
> = {
    resident: "secondary",
    moderator: "default",
    admin: "default",
    banned: "destructive",
};

export const Route = createFileRoute("/users/")({
    beforeLoad: async () => {
        const user = await ensureAuthenticated();
        if (!user)
            throw redirect({ to: "/login", search: { forbidden: false } });
        if (user.role !== "admin")
            throw redirect({ to: "/login", search: { forbidden: true } });
    },
    component: UsersPage,
});

function UsersPage() {
    const { data, isLoading, isError, fetchNextPage, hasNextPage } =
        useInfiniteUsers();
    const updateRole = useUpdateUserRole();
    const users = data?.pages.flat() ?? [];

    function handleRoleChange(userId: string, role: User["role"]) {
        updateRole.mutate(
            { id: userId, role },
            {
                onSuccess: () => toast.success("Rôle mis à jour"),
                onError: () =>
                    toast.error("Impossible de mettre à jour le rôle"),
            },
        );
    }

    function handleBanToggle(user: User) {
        const newRole = user.role === "banned" ? "resident" : "banned";
        handleRoleChange(user.id, newRole);
    }

    return (
        <div className="min-h-screen bg-zinc-50 p-6 dark:bg-zinc-950">
            <div className="mx-auto max-w-5xl space-y-6">
                <header className="flex items-center justify-between">
                    <div className="space-y-1">
                        <h1 className="text-xl font-semibold">
                            Gestion utilisateurs
                        </h1>
                        <Link
                            to="/dashboard"
                            className="text-muted-foreground text-sm hover:underline"
                        >
                            ← Tableau de bord
                        </Link>
                    </div>
                </header>

                {isLoading ? (
                    <div className="space-y-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full rounded" />
                        ))}
                    </div>
                ) : isError ? (
                    <p className="text-destructive text-sm">
                        Erreur de chargement. Réessayez.
                    </p>
                ) : users.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                        Aucun utilisateur.
                    </p>
                ) : (
                    <div className="rounded-lg border bg-white dark:bg-zinc-900">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Rôle</TableHead>
                                    <TableHead>Inscrit le</TableHead>
                                    <TableHead className="text-right">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">
                                            {user.email}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={
                                                    ROLE_VARIANTS[user.role] ??
                                                    "secondary"
                                                }
                                            >
                                                {ROLE_LABELS[user.role] ??
                                                    user.role}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {new Date(
                                                user.createdAt,
                                            ).toLocaleDateString("fr-FR")}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {user.role !== "banned" && (
                                                    <Select
                                                        value={user.role}
                                                        onValueChange={(role) =>
                                                            handleRoleChange(
                                                                user.id,
                                                                role as User["role"],
                                                            )
                                                        }
                                                        disabled={
                                                            updateRole.isPending
                                                        }
                                                    >
                                                        <SelectTrigger className="h-8 w-36 text-xs">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="resident">
                                                                Résident
                                                            </SelectItem>
                                                            <SelectItem value="moderator">
                                                                Modérateur
                                                            </SelectItem>
                                                            <SelectItem value="admin">
                                                                Administrateur
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                                <Button
                                                    variant={
                                                        user.role === "banned"
                                                            ? "outline"
                                                            : "destructive"
                                                    }
                                                    size="sm"
                                                    className="h-8 text-xs"
                                                    disabled={
                                                        updateRole.isPending
                                                    }
                                                    onClick={() =>
                                                        handleBanToggle(user)
                                                    }
                                                >
                                                    {user.role === "banned"
                                                        ? "Réactiver"
                                                        : "Bannir"}
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        {hasNextPage && (
                            <div className="border-t p-4">
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => fetchNextPage()}
                                >
                                    Voir plus
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
