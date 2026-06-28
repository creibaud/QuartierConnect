import { useHead } from "@unhead/react";
import { Coins01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    createFileRoute,
    Outlet,
    redirect,
    useLocation,
} from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ensureAuthenticated } from "@workspace/shared/lib/api";
import { usePointBalance } from "@workspace/shared/lib/hooks/points.hooks";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb";
import { Separator } from "@workspace/ui/components/separator";
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@workspace/ui/components/sidebar";
import { TooltipProvider } from "@workspace/ui/components/tooltip";

import { AppSidebar } from "@/components/app-sidebar";
import { clientNavItems } from "@/components/nav-items";

export const Route = createFileRoute("/_app")({
    beforeLoad: async () => {
        const user = await ensureAuthenticated();
        if (!user) {
            throw redirect({ to: "/login" });
        }
    },
    component: AppLayout,
});

function useActiveSectionTitleKey(): string {
    const { pathname } = useLocation();
    const active = clientNavItems.find(
        (item) => pathname === item.to || pathname.startsWith(`${item.to}/`),
    );
    return active?.title ?? "Accueil";
}

function HeaderPoints() {
    const { t } = useTranslation();
    const { data } = usePointBalance();
    return (
        <div
            className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium"
            title={t("pages.dashboard.yourPoints")}
        >
            <HugeiconsIcon icon={Coins01Icon} className="text-primary size-4" />
            <span className="tabular-nums">{data?.balance ?? "—"}</span>
            <span className="text-muted-foreground hidden sm:inline">pts</span>
        </div>
    );
}

function AppLayout() {
    const { t } = useTranslation();
    const sectionTitle = t(useActiveSectionTitleKey());
    useHead({ title: sectionTitle });

    return (
        <TooltipProvider>
            <SidebarProvider>
                <AppSidebar />
                <SidebarInset>
                    <header className="bg-background/75 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-20 flex h-16 shrink-0 items-center gap-2 border-b px-4 backdrop-blur">
                        <SidebarTrigger className="-ml-1" />
                        <Separator
                            orientation="vertical"
                            className="mr-1 data-[orientation=vertical]:h-4"
                        />
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem className="hidden md:block">
                                    <BreadcrumbPage>
                                        QuartierConnect
                                    </BreadcrumbPage>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator className="hidden md:block" />
                                <BreadcrumbItem>
                                    <BreadcrumbPage>
                                        {sectionTitle}
                                    </BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                        <div className="ml-auto flex items-center gap-2">
                            <HeaderPoints />
                            {/* Notification bell goes here once the notifications feature ships */}
                        </div>
                    </header>
                    <div className="flex flex-1 flex-col">
                        <Outlet />
                    </div>
                </SidebarInset>
            </SidebarProvider>
        </TooltipProvider>
    );
}
