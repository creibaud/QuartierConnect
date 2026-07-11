import {
    Calendar01Icon,
    CustomerServiceIcon,
    UserIcon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import type { Recommendation } from "@workspace/shared/lib/types";

export const TYPE_VARIANTS: Record<
    Recommendation["type"],
    "default" | "secondary" | "outline"
> = {
    service: "default",
    event: "secondary",
    neighbor: "outline",
};

export const TYPE_ICON: Record<Recommendation["type"], IconSvgElement> = {
    service: CustomerServiceIcon,
    event: Calendar01Icon,
    neighbor: UserIcon,
};

export const TYPE_ROUTES = {
    service: "/services",
    event: "/events",
    neighbor: "/messages",
} as const satisfies Record<Recommendation["type"], string>;
