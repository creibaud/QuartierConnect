import {
    Logout01Icon,
    Settings01Icon,
    UnfoldMoreIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { apiPost, assetUrl } from "@workspace/shared/lib/api";
import { clearTokens, getCurrentUser } from "@workspace/shared/lib/auth";
import { useMyProfile } from "@workspace/shared/lib/hooks/useMe";
import { setLocale } from "@workspace/shared/lib/i18n/index";
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@workspace/ui/components/avatar";
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
    const { data: profile } = useMyProfile();

    if (!user) {
        return null;
    }

    const roleLabels: Record<string, string> = {
        resident: t("roles.resident"),
        moderator: t("roles.moderator"),
        admin: t("roles.admin"),
        banned: t("roles.banned"),
    };
    const roleLabel = roleLabels[user.role] ?? user.role;
    const firstName = profile?.firstName ?? user.firstName ?? "";
    const lastName = profile?.lastName ?? user.lastName ?? "";
    const avatarSrc = profile?.avatarUrl
        ? assetUrl(profile.avatarUrl)
        : undefined;
    const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
    const displayName = fullName || user.email;
    const initials = fullName
        ? `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase()
        : initialsFromEmail(user.email);

    async function handleLogout() {
        await apiPost("/auth/logout", {}).catch(() => undefined);
        clearTokens();
        navigate({ to: "/login" });
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
                            <Avatar className="size-8">
                                <AvatarImage
                                    src={avatarSrc}
                                    className="object-cover"
                                />
                                <AvatarFallback>
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-medium">
                                    {displayName}
                                </span>
                                <span className="text-muted-foreground truncate text-xs">
                                    {fullName ? user.email : roleLabel}
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
                                <Avatar className="size-8">
                                    <AvatarImage
                                        src={avatarSrc}
                                        className="object-cover"
                                    />
                                    <AvatarFallback>
                                        {initials}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-medium">
                                        {displayName}
                                    </span>
                                    <span className="text-muted-foreground truncate text-xs">
                                        {fullName ? user.email : roleLabel}
                                    </span>
                                </div>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link to="/settings">
                                <HugeiconsIcon icon={Settings01Icon} />
                                {t("pages.account.title")}
                            </Link>
                        </DropdownMenuItem>
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
