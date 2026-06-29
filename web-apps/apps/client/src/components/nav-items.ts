import {
    Agreement01Icon,
    Alert01Icon,
    Calendar01Icon,
    Coins01Icon,
    CustomerServiceIcon,
    DashboardSquare01Icon,
    Message01Icon,
    SparklesIcon,
    ThumbsUpIcon,
} from "@hugeicons/core-free-icons";
import type { NavItem } from "@/components/nav-main";

export const clientNavItems: NavItem[] = [
    { title: "nav.dashboard", to: "/dashboard", icon: DashboardSquare01Icon },
    { title: "nav.contracts", to: "/contracts", icon: Agreement01Icon },
    { title: "nav.events", to: "/events", icon: Calendar01Icon },
    {
        title: "nav.incidents",
        to: "/incidents",
        icon: Alert01Icon,
        roles: ["moderator", "admin"],
    },
    { title: "nav.messages", to: "/messages", icon: Message01Icon },
    { title: "nav.services", to: "/services", icon: CustomerServiceIcon },
    { title: "nav.votes", to: "/votes", icon: ThumbsUpIcon },
    {
        title: "nav.recommendations",
        to: "/recommendations",
        icon: SparklesIcon,
    },
    { title: "nav.points", to: "/points", icon: Coins01Icon },
];
