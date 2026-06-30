import {
    Globe02Icon,
    Logout01Icon,
    MonitorDotIcon,
    Moon01Icon,
    Sun01Icon,
    UnfoldMoreIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useNavigate } from "@tanstack/react-router";
import { clearTokens, getCurrentUser } from "@workspace/shared/lib/auth";
import { useLocale } from "@workspace/shared/lib/hooks/useLocale";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@workspace/ui/components/sidebar";
import { useTheme } from "@/components/theme-provider";

function initialsFromEmail(email: string): string {
    return email.slice(0, 2).toUpperCase();
}

const THEME_ICON = {
    light: Sun01Icon,
    dark: Moon01Icon,
    system: MonitorDotIcon,
} as const;

export function NavUser() {
    const { t, locale, setLocale } = useLocale();
    const { isMobile } = useSidebar();
    const navigate = useNavigate();
    const { theme, setTheme } = useTheme();
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
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                                <HugeiconsIcon
                                    icon={THEME_ICON[theme] ?? MonitorDotIcon}
                                />
                                Thème
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                                <DropdownMenuRadioGroup
                                    value={theme}
                                    onValueChange={(v) =>
                                        setTheme(
                                            v as "light" | "dark" | "system",
                                        )
                                    }
                                >
                                    <DropdownMenuRadioItem value="light">
                                        <HugeiconsIcon icon={Sun01Icon} />
                                        Clair
                                    </DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="dark">
                                        <HugeiconsIcon icon={Moon01Icon} />
                                        Sombre
                                    </DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="system">
                                        <HugeiconsIcon
                                            icon={MonitorDotIcon}
                                        />
                                        Système
                                    </DropdownMenuRadioItem>
                                </DropdownMenuRadioGroup>
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                                <HugeiconsIcon icon={Globe02Icon} />
                                {locale === "fr" ? "Français" : "English"}
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                                <DropdownMenuRadioGroup
                                    value={locale}
                                    onValueChange={(v) =>
                                        setLocale(v as "fr" | "en")
                                    }
                                >
                                    <DropdownMenuRadioItem value="fr">
                                        Français
                                    </DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="en">
                                        English
                                    </DropdownMenuRadioItem>
                                </DropdownMenuRadioGroup>
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>
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
