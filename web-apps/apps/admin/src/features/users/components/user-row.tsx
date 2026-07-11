import { useTranslation } from "react-i18next";
import type { User } from "@workspace/shared/lib/types";
import { Badge } from "@workspace/ui/components/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@workspace/ui/components/select";
import { TableCell, TableRow } from "@workspace/ui/components/table";
import { getRoleLabel, ROLE_VARIANTS } from "../lib/user-roles";
import { UserBanDialog } from "./user-ban-dialog";

export function UserRow({
    user,
    isSelf,
    updatePending,
    onRoleChange,
    onBanToggle,
}: {
    user: User;
    isSelf: boolean;
    updatePending: boolean;
    onRoleChange: (userId: string, role: User["role"]) => void;
    onBanToggle: (user: User) => void;
}) {
    const { t, i18n } = useTranslation();

    return (
        <TableRow>
            <TableCell className="py-2 font-medium">{user.email}</TableCell>
            <TableCell className="py-2">
                <Badge variant={ROLE_VARIANTS[user.role] ?? "secondary"}>
                    {getRoleLabel(user.role, t)}
                </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground py-2 text-sm tabular-nums">
                {new Date(user.createdAt).toLocaleDateString(i18n.language)}
            </TableCell>
            <TableCell className="py-2 text-right">
                <div
                    className="flex items-center justify-end gap-2"
                    title={
                        isSelf
                            ? t("adminPages.users.cannotModifySelf")
                            : undefined
                    }
                >
                    {user.role !== "banned" && (
                        <Select
                            value={user.role}
                            onValueChange={(role) =>
                                onRoleChange(user.id, role as User["role"])
                            }
                            disabled={updatePending || isSelf}
                        >
                            <SelectTrigger className="h-8 w-36 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="resident">
                                    {t("adminPages.roles.resident")}
                                </SelectItem>
                                <SelectItem value="moderator">
                                    {t("adminPages.roles.moderator")}
                                </SelectItem>
                                <SelectItem value="admin">
                                    {t("adminPages.roles.admin")}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                    <UserBanDialog
                        user={user}
                        disabled={updatePending || isSelf}
                        onConfirm={() => onBanToggle(user)}
                    />
                </div>
            </TableCell>
        </TableRow>
    );
}
