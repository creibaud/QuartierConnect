import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslation } from "react-i18next";
import { Input } from "@workspace/ui/components/input";

export function EventsSearch({
    value,
    onChange,
}: {
    value: string;
    onChange: (value: string) => void;
}) {
    const { t } = useTranslation();

    return (
        <div className="relative">
            <HugeiconsIcon
                icon={Search01Icon}
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            />
            <Input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={t("adminPages.events.searchPlaceholder")}
                aria-label={t("adminPages.events.searchPlaceholder")}
                className="pl-9"
            />
        </div>
    );
}
