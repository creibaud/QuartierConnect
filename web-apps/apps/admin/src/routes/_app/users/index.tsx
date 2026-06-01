import { useState } from "react";
import {
    Search01Icon,
    UserMultipleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute } from "@tanstack/react-router";
import {
    useInfiniteUsers,
    useUpdateUserRole,
} from "@workspace/shared/lib/hooks/useAdminUsers";
import type { User } from "@workspace/shared/lib/types";
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
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@workspace/ui/components/empty";
import { Input } from "@workspace/ui/components/input";
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

export const Route = createFileRoute("/_app/users/")({
    component: UsersPage,
});

function UsersPage() {
    const { data, isLoading, isError, fetchNextPage, hasNextPage } =
        useInfiniteUsers();
    const updateRole = useUpdateUserRole();
    const users = data?.pages.flat() ?? [];

    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");

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

    const query = search.trim().toLowerCase();
    const filteredUsers = users.filter((user) => {
        const matchesSearch =
            query.length === 0 || user.email.toLowerCase().includes(query);
        const matchesRole = roleFilter === "all" || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    return (
        <div className="p-6">
            <div className="mx-auto max-w-6xl space-y-6">
                <PageHeader
                    title="Utilisateurs"
                    description="Gérez les rôles et les accès de la communauté."
                />

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative flex-1">
                        <HugeiconsIcon
                            icon={Search01Icon}
                            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                        />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Rechercher par email"
                            className="pl-9"
                        />
                    </div>
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                        <SelectTrigger className="w-full sm:w-48">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tous les rôles</SelectItem>
                            <SelectItem value="resident">Résident</SelectItem>
                            <SelectItem value="moderator">
                                Modérateur
                            </SelectItem>
                            <SelectItem value="admin">
                                Administrateur
                            </SelectItem>
                            <SelectItem value="banned">Banni</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <DataState
                    loading={isLoading}
                    error={isError ? true : undefined}
                    isEmpty={filteredUsers.length === 0}
                    skeleton={
                        <div className="flex flex-col gap-2">
                            {Array.from({ length: 6 }).map((_, i) => (
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
                                    <HugeiconsIcon icon={UserMultipleIcon} />
                                </EmptyMedia>
                                <EmptyTitle>Aucun utilisateur</EmptyTitle>
                                <EmptyDescription>
                                    Aucun utilisateur ne correspond à votre
                                    recherche. Ajustez les filtres pour élargir
                                    les résultats.
                                </EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    }
                >
                    <div className="bg-card rounded-lg border">
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
                                {filteredUsers.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="py-2 font-medium">
                                            {user.email}
                                        </TableCell>
                                        <TableCell className="py-2">
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
                                        <TableCell className="text-muted-foreground py-2 text-sm tabular-nums">
                                            {new Date(
                                                user.createdAt,
                                            ).toLocaleDateString("fr-FR")}
                                        </TableCell>
                                        <TableCell className="py-2 text-right">
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
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            variant={
                                                                user.role ===
                                                                "banned"
                                                                    ? "outline"
                                                                    : "destructive"
                                                            }
                                                            size="sm"
                                                            className="h-8 text-xs"
                                                            disabled={
                                                                updateRole.isPending
                                                            }
                                                        >
                                                            {user.role ===
                                                            "banned"
                                                                ? "Réactiver"
                                                                : "Bannir"}
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>
                                                                {user.role ===
                                                                "banned"
                                                                    ? "Réactiver cet utilisateur ?"
                                                                    : "Bannir cet utilisateur ?"}
                                                            </AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                {user.role ===
                                                                "banned"
                                                                    ? `${user.email} retrouvera le rôle Résident et l'accès à la plateforme.`
                                                                    : `${user.email} perdra immédiatement l'accès à la plateforme.`}
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>
                                                                Annuler
                                                            </AlertDialogCancel>
                                                            <AlertDialogAction
                                                                variant={
                                                                    user.role ===
                                                                    "banned"
                                                                        ? "default"
                                                                        : "destructive"
                                                                }
                                                                onClick={() =>
                                                                    handleBanToggle(
                                                                        user,
                                                                    )
                                                                }
                                                            >
                                                                {user.role ===
                                                                "banned"
                                                                    ? "Réactiver"
                                                                    : "Bannir"}
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
                </DataState>
            </div>
        </div>
    );
}
