import * as React from "react";
import { cn } from "@workspace/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

function BubbleGroup({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="bubble-group"
            className={cn("flex min-w-0 flex-col gap-2", className)}
            {...props}
        />
    );
}

const bubbleVariants = cva(
    "group/bubble relative flex w-fit max-w-[min(92%,42ch)] min-w-0 flex-col gap-1 group-data-[align=end]/message:self-end data-[align=end]:self-end data-[variant=ghost]:max-w-full sm:max-w-[min(78%,42ch)]",
    {
        variants: {
            variant: {
                default:
                    "*:data-[slot=bubble-content]:bg-primary *:data-[slot=bubble-content]:text-primary-foreground [&>[data-slot=bubble-content]:is(button,a):hover]:bg-primary/80",
                secondary:
                    "*:data-[slot=bubble-content]:bg-secondary *:data-[slot=bubble-content]:text-secondary-foreground [&>[data-slot=bubble-content]:is(button,a):hover]:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]",
                muted: "*:data-[slot=bubble-content]:bg-muted [&>[data-slot=bubble-content]:is(button,a):hover]:bg-[color-mix(in_oklch,var(--muted),var(--foreground)_5%)]",
                tinted: "*:data-[slot=bubble-content]:text-foreground *:data-[slot=bubble-content]:bg-[oklch(from_var(--primary)_0.93_calc(c*0.4)_h)] dark:*:data-[slot=bubble-content]:bg-[oklch(from_var(--primary)_0.3_calc(c*0.4)_h)] [&>[data-slot=bubble-content]:is(button,a):hover]:bg-[oklch(from_var(--primary)_0.88_calc(c*0.5)_h)] dark:[&>[data-slot=bubble-content]:is(button,a):hover]:bg-[oklch(from_var(--primary)_0.35_calc(c*0.5)_h)]",
                outline:
                    "*:data-[slot=bubble-content]:border-border *:data-[slot=bubble-content]:bg-background [&>[data-slot=bubble-content]:is(button,a):hover]:bg-muted [&>[data-slot=bubble-content]:is(button,a):hover]:text-foreground dark:[&>[data-slot=bubble-content]:is(button,a):hover]:bg-input/30",
                ghost: "[&>[data-slot=bubble-content]:is(button,a):hover]:bg-muted [&>[data-slot=bubble-content]:is(button,a):hover]:text-foreground dark:[&>[data-slot=bubble-content]:is(button,a):hover]:bg-muted/50 border-none *:data-[slot=bubble-content]:rounded-none *:data-[slot=bubble-content]:bg-transparent *:data-[slot=bubble-content]:p-0",
                destructive:
                    "*:data-[slot=bubble-content]:bg-destructive/10 *:data-[slot=bubble-content]:text-destructive dark:*:data-[slot=bubble-content]:bg-destructive/20 [&>[data-slot=bubble-content]:is(button,a):hover]:bg-destructive/20 dark:[&>[data-slot=bubble-content]:is(button,a):hover]:bg-destructive/30",
                outgoing:
                    "*:data-[slot=bubble-content]:bg-bubble-out *:data-[slot=bubble-content]:text-bubble-out-foreground *:data-[slot=bubble-content]:rounded-ee-[3px] [&>[data-slot=bubble-content]:is(button,a):hover]:bg-[oklch(from_var(--bubble-out)_calc(l*0.94)_c_h)]",
                incoming:
                    "*:data-[slot=bubble-content]:bg-bubble-in *:data-[slot=bubble-content]:text-bubble-in-foreground *:data-[slot=bubble-content]:border-bubble-in-border *:data-[slot=bubble-content]:rounded-es-[3px] [&>[data-slot=bubble-content]:is(button,a):hover]:bg-[oklch(from_var(--bubble-in)_calc(l*1.06)_c_h)]",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    },
);

function Bubble({
    variant = "default",
    align = "start",
    className,
    ...props
}: React.ComponentProps<"div"> &
    VariantProps<typeof bubbleVariants> & {
        align?: "start" | "end";
    }) {
    return (
        <div
            data-slot="bubble"
            data-variant={variant}
            data-align={align}
            className={cn(bubbleVariants({ variant }), className)}
            {...props}
        />
    );
}

function BubbleContent({
    asChild = false,
    className,
    ...props
}: React.ComponentProps<"div"> & {
    asChild?: boolean;
}) {
    const Comp = asChild ? Slot.Root : "div";

    return (
        <Comp
            data-slot="bubble-content"
            className={cn(
                "[button,a]:focus-visible:border-ring [button,a]:focus-visible:ring-ring/50 w-fit max-w-full min-w-0 overflow-hidden rounded-md border border-transparent px-3 py-2 text-sm leading-snug wrap-break-word whitespace-pre-wrap group-data-[align=end]/bubble:self-end [button]:text-left [button,a]:transition-colors [button,a]:outline-none [button,a]:focus-visible:ring-3",
                className,
            )}
            {...props}
        />
    );
}

export { BubbleGroup, Bubble, BubbleContent };
