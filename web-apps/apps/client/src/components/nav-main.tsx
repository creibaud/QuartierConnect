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

function findActiveNavItem(
    items: NavItem[],
    pathname: string,
): NavItem | undefined {
    return (
        items.find((item) => pathname === item.to) ??
        items.find((item) => pathname.startsWith(`${item.to}/`))
    );
}

export function NavMain({ groups, role }: { groups: NavGroup[]; role: string }) {
    const { pathname } = useLocation();
    const { t } = useTranslation();
    const activeItem = findActiveNavItem(
        groups.flatMap((group) => group.items),
        pathname,
    );

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
                                        isActive={item === activeItem}
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
