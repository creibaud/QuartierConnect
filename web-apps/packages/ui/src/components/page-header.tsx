import * as React from "react";
import { cn } from "@workspace/ui/lib/utils";

export interface PageHeaderProps
    extends Omit<React.ComponentProps<"div">, "title"> {
    title: React.ReactNode;
    description?: React.ReactNode;
    actions?: React.ReactNode;
}

export function PageHeader({
    title,
    description,
    actions,
    className,
    ...props
}: PageHeaderProps) {
    return (
        <div
            className={cn(
                "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between",
                className,
            )}
            {...props}
        >
            <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight">
                    {title}
                </h1>
                {description ? (
                    <p className="text-muted-foreground text-sm">
                        {description}
                    </p>
                ) : null}
            </div>
            {actions ? (
                <div className="flex items-center gap-2">{actions}</div>
            ) : null}
        </div>
    );
}
