import {
    Agreement01Icon,
    Alert01Icon,
    Building01Icon,
    Calendar01Icon,
    CodeSquareIcon,
    CustomerServiceIcon,
    DashboardSquare01Icon,
    UserMultipleIcon,
} from "@hugeicons/core-free-icons";

import type { NavItem } from "@/components/nav-main";

export const adminNavItems: NavItem[] = [
    { title: "Tableau de bord", to: "/dashboard", icon: DashboardSquare01Icon },
    { title: "Utilisateurs", to: "/users", icon: UserMultipleIcon },
    { title: "Incidents", to: "/incidents", icon: Alert01Icon },
    { title: "Événements", to: "/events", icon: Calendar01Icon },
    { title: "Quartiers", to: "/neighborhoods", icon: Building01Icon },
    {
        title: "Votes communautaires",
        to: "/community-votes",
        icon: Agreement01Icon,
    },
    { title: "Services", to: "/services", icon: CustomerServiceIcon },
    { title: "Éditeur DSL", to: "/dsl", icon: CodeSquareIcon },
];
