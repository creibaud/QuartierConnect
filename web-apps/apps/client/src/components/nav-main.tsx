import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { Link, useLocation } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@workspace/ui/components/sidebar";

export interface NavItem {
    title: string;
    to: string;
    icon: IconSvgElement;
    /** If set, only these roles see the item. Absent = everyone. */
    roles?: string[];
}

export interface NavGroup {
    label: string;
    items: NavItem[];
}

function isItemActive(pathname: string, to: string): boolean {
    return pathname === to || pathname.startsWith(`${to}/`);
}

export function NavMain({ groups, role }: { groups: NavGroup[]; role: string }) {
    const { pathname } = useLocation();
    const { t } = useTranslation();

    return (
        <>
            {groups.map((group) => {
                const visibleItems = group.items.filter(
                    (item) => !item.roles || item.roles.includes(role),
                );
                if (visibleItems.length === 0) return null;

                return (
                    <SidebarGroup key={group.label}>
                        <SidebarGroupLabel>{t(group.label)}</SidebarGroupLabel>
                        <SidebarMenu>
                            {visibleItems.map((item) => (
                                <SidebarMenuItem key={item.to}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={isItemActive(pathname, item.to)}
                                        tooltip={t(item.title)}
                                    >
                                        <Link to={item.to}>
                                            <HugeiconsIcon icon={item.icon} />
                                            <span>{t(item.title)}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroup>
                );
            })}
        </>
    );
}
