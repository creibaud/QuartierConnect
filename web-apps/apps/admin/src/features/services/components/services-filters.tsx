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
import { SERVICE_CATEGORIES } from "../lib/service-categories";

export function ServicesFilters({
    search,
    onSearchChange,
    categoryFilter,
    onCategoryChange,
}: {
    search: string;
    onSearchChange: (value: string) => void;
    categoryFilter: string;
    onCategoryChange: (value: string) => void;
}) {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-64">
                <HugeiconsIcon
                    icon={Search01Icon}
                    className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                />
                <Input
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder={t("adminPages.services.searchPlaceholder")}
                    aria-label={t("adminPages.services.searchPlaceholder")}
                    className="pl-9"
                />
            </div>
            <Select value={categoryFilter} onValueChange={onCategoryChange}>
                <SelectTrigger
                    className="w-full sm:w-56"
                    aria-label={t("adminPages.services.category")}
                >
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">
                        {t("adminPages.services.allCategories")}
                    </SelectItem>
                    {SERVICE_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                            {t(`adminPages.serviceCategories.${category}`, {
                                defaultValue: category,
                            })}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
