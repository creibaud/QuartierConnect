import { HugeiconsIcon } from "@hugeicons/react";
import { ToggleGroupItem } from "@workspace/ui/components/toggle-group";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@workspace/ui/components/tooltip";

export type ViewMode = "list" | "calendar" | "swipe" | "map";

export function ViewToggleItem({
    value,
    label,
    icon,
}: {
    value: ViewMode;
    label: string;
    icon: React.ComponentProps<typeof HugeiconsIcon>["icon"];
}) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <ToggleGroupItem value={value} aria-label={label}>
                    <HugeiconsIcon icon={icon} />
                </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
        </Tooltip>
    );
}
