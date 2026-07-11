import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslation } from "react-i18next";
import { Input } from "@workspace/ui/components/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@workspace/ui/components/select";

export function UsersFilters({
    search,
    onSearchChange,
    roleFilter,
    onRoleFilterChange,
}: {
    search: string;
    onSearchChange: (value: string) => void;
    roleFilter: string;
    onRoleFilterChange: (value: string) => void;
}) {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
                <HugeiconsIcon
                    icon={Search01Icon}
                    className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                />
                <Input
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder={t("adminPages.users.searchPlaceholder")}
                    aria-label={t("adminPages.users.searchPlaceholder")}
                    className="pl-9"
                />
            </div>
            <Select value={roleFilter} onValueChange={onRoleFilterChange}>
                <SelectTrigger className="w-full sm:w-48">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">
                        {t("adminPages.users.allRoles")}
                    </SelectItem>
                    <SelectItem value="resident">
                        {t("adminPages.roles.resident")}
                    </SelectItem>
                    <SelectItem value="moderator">
                        {t("adminPages.roles.moderator")}
                    </SelectItem>
                    <SelectItem value="admin">
                        {t("adminPages.roles.admin")}
                    </SelectItem>
                    <SelectItem value="banned">
                        {t("adminPages.roles.banned")}
                    </SelectItem>
                </SelectContent>
            </Select>
        </div>
    );
}
