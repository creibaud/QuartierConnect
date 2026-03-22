"use client";

import * as React from "react";
import { cn } from "@workspace/ui/lib/utils";
import { Separator as SeparatorPrimitive } from "radix-ui";

function Separator({
    className,
    orientation = "horizontal",
    decorative = true,
    ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
    return (
        <SeparatorPrimitive.Root
            className={cn(
                "bg-border shrink-0 data-horizontal:h-px data-horizontal:w-full data-vertical:w-px data-vertical:self-stretch",
                className,
            )}
            data-slot="separator"
            decorative={decorative}
            orientation={orientation}
            {...props}
        />
    );
}

export { Separator };
