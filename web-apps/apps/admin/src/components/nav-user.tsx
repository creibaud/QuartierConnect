import { Logout01Icon, UnfoldMoreIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { clearTokens, getCurrentUser } from "@workspace/shared/lib/auth";
import { setLocale } from "@workspace/shared/lib/i18n/index";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@workspace/ui/components/sidebar";

function initialsFromEmail(email: string): string {
    return email.slice(0, 2).toUpperCase();
}

export function NavUser() {
    const { t } = useTranslation();
    const { isMobile } = useSidebar();
    const navigate = useNavigate();
    const user = getCurrentUser();

    if (!user) {
        return null;
    }

    const roleLabels: Record<string, string> = {
        resident: t("adminPages.roles.resident"),
        moderator: t("adminPages.roles.moderator"),
        admin: t("adminPages.roles.admin"),
        banned: t("adminPages.roles.banned"),
    };

    const roleLabel = roleLabels[user.role] ?? user.role;

    function handleLogout() {
        clearTokens();
        navigate({ to: "/login", search: { forbidden: false } });
    }

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        >
                            <Avatar className="size-8 rounded-lg">
                                <AvatarFallback className="rounded-lg">
                                    {initialsFromEmail(user.email)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-medium">
                                    {user.email}
                                </span>
                                <span className="text-muted-foreground truncate text-xs">
                                    {roleLabel}
                                </span>
                            </div>
                            <HugeiconsIcon
                                icon={UnfoldMoreIcon}
                                className="ml-auto size-4"
                            />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                        side={isMobile ? "bottom" : "right"}
                        align="end"
                        sideOffset={4}
                    >
                        <DropdownMenuLabel className="p-0 font-normal">
                            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                <Avatar className="size-8 rounded-lg">
                                    <AvatarFallback className="rounded-lg">
                                        {initialsFromEmail(user.email)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-medium">
                                        {user.email}
                                    </span>
                                    <span className="text-muted-foreground truncate text-xs">
                                        {roleLabel}
                                    </span>
                                </div>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setLocale("fr")}>
                            Français
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setLocale("en")}>
                            English
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout}>
                            <HugeiconsIcon icon={Logout01Icon} />
                            {t("auth.logout")}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
