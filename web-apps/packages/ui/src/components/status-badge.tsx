import * as React from "react";
import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";

export type StatusTone =
    | "pending"
    | "progress"
    | "success"
    | "danger"
    | "neutral";

const STATUS_TONES: Record<string, StatusTone> = {
    open: "pending",
    pending: "pending",
    in_progress: "progress",
    partial: "progress",
    accepted: "success",
    active: "success",
    completed: "success",
    fully_signed: "success",
    resolved: "success",
    cancelled: "danger",
    declined: "danger",
    closed: "neutral",
    draft: "neutral",
};

/* The success tone uses the Voisinage accent (sage green) from
   packages/ui/src/styles/voisinage.css, shared by client and admin. */
const TONE_CLASSES: Record<StatusTone, string> = {
    pending:
        "border-amber-600/30 bg-amber-500/10 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300",
    progress: "border-transparent bg-secondary text-secondary-foreground",
    success: "border-accent-foreground/25 bg-accent text-accent-foreground",
    danger: "border-destructive/25 bg-destructive/10 text-destructive dark:bg-destructive/20",
    neutral: "border-border bg-transparent text-muted-foreground",
};

export function statusTone(status: string): StatusTone {
    return STATUS_TONES[status] ?? "neutral";
}

export function StatusBadge({
    tone,
    className,
    children,
    ...props
}: React.ComponentProps<"span"> & { tone: StatusTone }) {
    return (
        <Badge
            variant="outline"
            data-tone={tone}
            className={cn(TONE_CLASSES[tone], className)}
            {...props}
        >
            <span
                aria-hidden
                className="size-1.5 shrink-0 rounded-full bg-current"
            />
            {children}
        </Badge>
    );
}
