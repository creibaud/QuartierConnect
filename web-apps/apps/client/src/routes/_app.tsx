import { useTranslation } from "react-i18next";
import { Coins01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    createFileRoute,
    Outlet,
    redirect,
    useLocation,
} from "@tanstack/react-router";
import { useHead } from "@unhead/react";
import { ensureAuthenticated } from "@workspace/shared/lib/api";
import { usePointBalance } from "@workspace/shared/lib/hooks/points.hooks";
import { fetchNeighborhoodStatus } from "@/features/onboarding/hooks/address.hooks";
import { gateState, type NeighborhoodStatus } from "@/features/onboarding/lib/address-state";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Separator } from "@workspace/ui/components/separator";
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@workspace/ui/components/sidebar";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { AppSidebar } from "@/components/app-sidebar";
import { clientNavItems } from "@/components/nav-items";

export const Route = createFileRoute("/_app")({
    beforeLoad: async () => {
        const user = await ensureAuthenticated();
        if (!user) {
            throw redirect({ to: "/login" });
        }
        if (user.role !== "admin") {
            let status: NeighborhoodStatus | null = null;
            try {
                status = await fetchNeighborhoodStatus();
            } catch {
                // Fail-open: a transient status-fetch error must not block navigation
            }
            if (status !== null) {
                const state = gateState(status);
                if (state === "needs-address") {
                    throw redirect({ to: "/onboarding/address" });
                }
                if (state === "pending") throw redirect({ to: "/onboarding/pending" });
            }
        }
    },
    component: AppLayout,
});

function useActiveSectionTitleKey(): string {
    const { pathname } = useLocation();
    // Two-pass: exact match wins over prefix so /services/mine resolves
    // to nav.myServices rather than nav.services.
    const active =
        clientNavItems.find((item) => pathname === item.to) ??
        clientNavItems.find((item) => pathname.startsWith(`${item.to}/`));
    if (active) return active.title;
    if (pathname.startsWith("/settings")) return "pages.account.title";
    return "Accueil";
}

function HeaderPoints() {
    const { t } = useTranslation();
    const { data } = usePointBalance();
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium">
                    <HugeiconsIcon
                        icon={Coins01Icon}
                        className="text-primary size-4"
                    />
                    <span className="tabular-nums">{data?.balance ?? "—"}</span>
                    <span className="text-muted-foreground hidden sm:inline">
                        pts
                    </span>
                </div>
            </TooltipTrigger>
            <TooltipContent>{t("pages.dashboard.yourPoints")}</TooltipContent>
        </Tooltip>
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
                <SidebarInset className="h-svh overflow-hidden">
                    <header className="bg-background/75 supports-[backdrop-filter]:bg-background/60 z-20 flex h-16 shrink-0 items-center gap-2 border-b px-4 backdrop-blur">
                        <SidebarTrigger className="-ml-1" />
                        <Separator
                            orientation="vertical"
                            className="mt-6 mr-1 data-[orientation=vertical]:h-4"
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
                    <ScrollArea className="min-h-0 flex-1">
                        <div className="flex flex-1 flex-col">
                            <Outlet />
                        </div>
                    </ScrollArea>
                </SidebarInset>
            </SidebarProvider>
        </TooltipProvider>
    );
}
