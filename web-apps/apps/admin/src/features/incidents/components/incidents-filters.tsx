import { useTranslation } from "react-i18next";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@workspace/ui/components/select";
import { categoryKey } from "../lib/incident-status";

export function IncidentsFilters({
    categoryFilter,
    onCategoryChange,
    statusFilter,
    onStatusChange,
}: {
    categoryFilter: string;
    onCategoryChange: (value: string) => void;
    statusFilter: string;
    onStatusChange: (value: string) => void;
}) {
    const { t } = useTranslation();

    return (
        <div className="flex flex-wrap items-center gap-2">
            <Select value={categoryFilter} onValueChange={onCategoryChange}>
                <SelectTrigger
                    className="w-52"
                    aria-label={t("adminPages.incidents.categoryColumn")}
                >
                    <SelectValue
                        placeholder={t("adminPages.incidents.allCategories")}
                    />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">
                        {t("adminPages.incidents.allCategories")}
                    </SelectItem>
                    <SelectItem value="neighborhood">
                        {t(categoryKey("neighborhood"))}
                    </SelectItem>
                    <SelectItem value="reporting">
                        {t(categoryKey("reporting"))}
                    </SelectItem>
                    <SelectItem value="bug">{t(categoryKey("bug"))}</SelectItem>
                </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={onStatusChange}>
                <SelectTrigger
                    className="w-44"
                    aria-label={t("adminPages.incidents.statusColumn")}
                >
                    <SelectValue
                        placeholder={t("adminPages.incidents.allStatuses")}
                    />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">
                        {t("adminPages.incidents.filterAll")}
                    </SelectItem>
                    <SelectItem value="open">
                        {t("adminPages.incidents.filterOpen")}
                    </SelectItem>
                    <SelectItem value="in_progress">
                        {t("incidents.status.in_progress")}
                    </SelectItem>
                    <SelectItem value="resolved">
                        {t("adminPages.incidents.filterResolved")}
                    </SelectItem>
                </SelectContent>
            </Select>
        </div>
    );
}
