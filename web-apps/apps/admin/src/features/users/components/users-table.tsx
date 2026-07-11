import { useTranslation } from "react-i18next";
import type { User } from "@workspace/shared/lib/types";
import { SortableHead } from "@workspace/ui/components/sortable-head";
import {
    Table,
    TableBody,
    TableHead,
    TableHeader,
    TableRow,
} from "@workspace/ui/components/table";
import { UserRow } from "./user-row";

export function UsersTable({
    users,
    sort,
    order,
    onSort,
    currentUserId,
    updatePending,
    onRoleChange,
    onBanToggle,
}: {
    users: User[];
    sort: string;
    order: "asc" | "desc";
    onSort: (field: string) => void;
    currentUserId: string | null;
    updatePending: boolean;
    onRoleChange: (userId: string, role: User["role"]) => void;
    onBanToggle: (user: User) => void;
}) {
    const { t } = useTranslation();
    const sortDirection = (field: string) => (sort === field ? order : null);

    return (
        <div className="bg-card rounded-lg border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <SortableHead
                            direction={sortDirection("email")}
                            onSort={() => onSort("email")}
                        >
                            {t("auth.email")}
                        </SortableHead>
                        <SortableHead
                            direction={sortDirection("role")}
                            onSort={() => onSort("role")}
                        >
                            {t("adminPages.users.role")}
                        </SortableHead>
                        <SortableHead
                            direction={sortDirection("createdAt")}
                            onSort={() => onSort("createdAt")}
                        >
                            {t("adminPages.users.registeredAt")}
                        </SortableHead>
                        <TableHead className="text-right">
                            {t("adminPages.common.actions")}
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {users.map((user) => (
                        <UserRow
                            key={user.id}
                            user={user}
                            isSelf={user.id === currentUserId}
                            updatePending={updatePending}
                            onRoleChange={onRoleChange}
                            onBanToggle={onBanToggle}
                        />
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
