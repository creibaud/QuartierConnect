import {
    Agreement01Icon,
    Alert01Icon,
    Calendar01Icon,
    Calendar02Icon,
    Coins01Icon,
    CustomerServiceIcon,
    DashboardSquare01Icon,
    Message01Icon,
    SparklesIcon,
    Task01Icon,
    ThumbsUpIcon,
} from "@hugeicons/core-free-icons";
import type { NavGroup, NavItem } from "@/components/nav-main";

export const clientNavGroups: NavGroup[] = [
    {
        label: "nav.groups.home",
        items: [
            { title: "nav.dashboard", to: "/dashboard", icon: DashboardSquare01Icon },
        ],
    },
    {
        label: "nav.groups.neighborhood",
        items: [
            { title: "nav.services", to: "/services", icon: CustomerServiceIcon },
            { title: "nav.events", to: "/events", icon: Calendar01Icon },
            { title: "nav.votes", to: "/votes", icon: ThumbsUpIcon },
            { title: "nav.recommendations", to: "/recommendations", icon: SparklesIcon },
        ],
    },
    {
        label: "nav.groups.mySpace",
        items: [
            { title: "nav.myServices", to: "/services/mine", icon: Task01Icon },
            { title: "nav.points", to: "/points", icon: Coins01Icon },
            { title: "nav.messages", to: "/messages", icon: Message01Icon },
            { title: "nav.bookings", to: "/bookings", icon: Calendar02Icon },
            { title: "nav.contracts", to: "/contracts", icon: Agreement01Icon },
        ],
    },
    {
        label: "nav.groups.moderation",
        items: [
            {
                title: "nav.incidents",
                to: "/incidents",
                icon: Alert01Icon,
                roles: ["moderator", "admin"],
            },
        ],
    },
];

// Derived flat list — keeps routes/_app.tsx (title lookup) working.
// Includes /services/mine alongside all other routes.
export const clientNavItems: NavItem[] = clientNavGroups.flatMap((g) => g.items);
