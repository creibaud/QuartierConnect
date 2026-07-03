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

import type { NavGroup, NavItem } from "@/components/nav-main";

export const adminNavGroups: NavGroup[] = [
    {
        label: "nav.groups.overview",
        items: [
            {
                title: "nav.dashboard",
                to: "/dashboard",
                icon: DashboardSquare01Icon,
            },
        ],
    },
    {
        label: "nav.groups.community",
        items: [
            {
                title: "nav.services",
                to: "/services",
                icon: CustomerServiceIcon,
            },
            { title: "nav.events", to: "/events", icon: Calendar01Icon },
            {
                title: "nav.communityVotes",
                to: "/community-votes",
                icon: Agreement01Icon,
            },
            { title: "nav.incidents", to: "/incidents", icon: Alert01Icon },
        ],
    },
    {
        label: "nav.groups.management",
        items: [
            { title: "nav.users", to: "/users", icon: UserMultipleIcon },
            {
                title: "nav.neighborhoods",
                to: "/neighborhoods",
                icon: Building01Icon,
            },
            {
                title: "nav.coverage",
                to: "/uncovered-addresses",
                icon: MapsLocation01Icon,
            },
        ],
    },
    {
        label: "nav.groups.tools",
        items: [{ title: "nav.dsl", to: "/dsl", icon: CodeSquareIcon }],
    },
];

// Liste plate dérivée — garde le lookup de titre de section (_app.tsx) fonctionnel.
export const adminNavItems: NavItem[] = adminNavGroups.flatMap((g) => g.items);
