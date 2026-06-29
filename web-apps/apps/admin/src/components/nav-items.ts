import {
    Agreement01Icon,
    Alert01Icon,
    Building01Icon,
    Calendar01Icon,
    CodeSquareIcon,
    CustomerServiceIcon,
    DashboardSquare01Icon,
    MapsLocation01Icon,
    UserMultipleIcon,
} from "@hugeicons/core-free-icons";

import type { NavItem } from "@/components/nav-main";

export const adminNavItems: NavItem[] = [
    { title: "nav.dashboard", to: "/dashboard", icon: DashboardSquare01Icon },
    { title: "nav.users", to: "/users", icon: UserMultipleIcon },
    { title: "nav.incidents", to: "/incidents", icon: Alert01Icon },
    { title: "nav.events", to: "/events", icon: Calendar01Icon },
    { title: "nav.neighborhoods", to: "/neighborhoods", icon: Building01Icon },
    {
        title: "nav.coverage",
        to: "/uncovered-addresses",
        icon: MapsLocation01Icon,
    },
    {
        title: "nav.communityVotes",
        to: "/community-votes",
        icon: Agreement01Icon,
    },
    { title: "nav.services", to: "/services", icon: CustomerServiceIcon },
    { title: "nav.dsl", to: "/dsl", icon: CodeSquareIcon },
];
