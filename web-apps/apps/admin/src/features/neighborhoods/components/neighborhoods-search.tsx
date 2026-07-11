import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslation } from "react-i18next";
import { Input } from "@workspace/ui/components/input";

export function NeighborhoodsSearch({
    value,
    onChange,
}: {
    value: string;
    onChange: (value: string) => void;
}) {
    const { t } = useTranslation();

    return (
        <div className="relative w-full sm:w-64">
            <HugeiconsIcon
                icon={Search01Icon}
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            />
            <Input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={t("adminPages.neighborhoods.searchPlaceholder")}
                aria-label={t("adminPages.neighborhoods.searchPlaceholder")}
                className="pl-9"
                data-testid="neighborhood-search"
            />
        </div>
    );
}
