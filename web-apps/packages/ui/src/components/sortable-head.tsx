"use client";

import * as React from "react";
import {
    ArrowDown01Icon,
    ArrowUp01Icon,
    ArrowUpDownIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { TableHead } from "@workspace/ui/components/table";
import type { SortDirection } from "@workspace/ui/hooks/use-table-sort";
import { cn } from "@workspace/ui/lib/utils";

function SortableHead({
    direction,
    onSort,
    className,
    children,
    ...props
}: React.ComponentProps<typeof TableHead> & {
    direction: SortDirection | null;
    onSort: () => void;
}) {
    const ariaSort =
        direction === "asc"
            ? "ascending"
            : direction === "desc"
              ? "descending"
              : "none";
    const icon =
        direction === "asc"
            ? ArrowUp01Icon
            : direction === "desc"
              ? ArrowDown01Icon
              : ArrowUpDownIcon;

    return (
        <TableHead
            className={cn("p-0", className)}
            aria-sort={ariaSort}
            {...props}
        >
            <button
                type="button"
                data-slot="sortable-head"
                onClick={onSort}
                className="group focus-visible:ring-ring/50 flex h-10 w-full items-center gap-1.5 px-2 text-left font-medium whitespace-nowrap outline-none select-none focus-visible:ring-2"
            >
                {children}
                <HugeiconsIcon
                    icon={icon}
                    strokeWidth={2}
                    className={cn(
                        "size-3.5 shrink-0 transition-opacity",
                        direction
                            ? "opacity-100"
                            : "opacity-0 group-hover:opacity-50 group-focus-visible:opacity-50",
                    )}
                />
            </button>
        </TableHead>
    );
}

export { SortableHead };
