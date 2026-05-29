import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "@workspace/ui/lib/utils";

type HugeiconsIconType = React.ComponentProps<typeof HugeiconsIcon>["icon"];

type EmptyStateProps = {
    icon: HugeiconsIconType;
    title: string;
    description?: string;
    action?: React.ReactNode;
    className?: string;
};

function EmptyState({
    icon,
    title,
    description,
    action,
    className,
}: EmptyStateProps) {
    return (
        <div
            className={cn(
                "border-border bg-card flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed px-6 py-16 text-center",
                className,
            )}
        >
            <div className="bg-muted text-muted-foreground rounded-full p-4">
                <HugeiconsIcon icon={icon} size={32} strokeWidth={1.5} />
            </div>
            <div className="space-y-1">
                <p className="text-foreground text-base font-medium">{title}</p>
                {description ? (
                    <p className="text-muted-foreground mx-auto max-w-sm text-sm">
                        {description}
                    </p>
                ) : null}
            </div>
            {action ? <div className="pt-2">{action}</div> : null}
        </div>
    );
}

export { EmptyState };
