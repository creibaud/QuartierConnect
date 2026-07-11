import { Tick01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export function ChoiceIndicator({
    selected,
    multiple,
}: {
    selected: boolean;
    multiple: boolean;
}) {
    return (
        <span
            aria-hidden
            className={`flex size-4 shrink-0 items-center justify-center border transition-colors ${
                multiple ? "rounded-[4px]" : "rounded-full"
            } ${selected ? "border-primary" : "border-muted-foreground/40"}`}
        >
            {selected &&
                (multiple ? (
                    <HugeiconsIcon
                        icon={Tick01Icon}
                        className="text-primary size-3"
                    />
                ) : (
                    <span className="bg-primary size-2 rounded-full" />
                ))}
        </span>
    );
}
