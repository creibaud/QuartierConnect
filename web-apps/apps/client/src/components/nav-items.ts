import {
    Agreement01Icon,
    Alert01Icon,
    Calendar01Icon,
    CustomerServiceIcon,
    DashboardSquare01Icon,
    Message01Icon,
    ThumbsUpIcon,
} from "@hugeicons/core-free-icons";

import type { NavItem } from "@/components/nav-main";

export const clientNavItems: NavItem[] = [
    { title: "Tableau de bord", to: "/dashboard", icon: DashboardSquare01Icon },
    { title: "Contrats", to: "/contracts", icon: Agreement01Icon },
    { title: "Événements", to: "/events", icon: Calendar01Icon },
    { title: "Incidents", to: "/incidents", icon: Alert01Icon },
    { title: "Messages", to: "/messages", icon: Message01Icon },
    { title: "Services", to: "/services", icon: CustomerServiceIcon },
    { title: "Votes", to: "/votes", icon: ThumbsUpIcon },
];
