import { useHead } from "@unhead/react";
import {
    createFileRoute,
    Outlet,
    redirect,
    useLocation,
} from "@tanstack/react-router";
import { ensureAuthenticated } from "@workspace/shared/lib/api";
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

function useActiveSectionTitle(): string {
    const { pathname } = useLocation();
    const active = clientNavItems.find(
        (item) => pathname === item.to || pathname.startsWith(`${item.to}/`),
    );
    return active?.title ?? "Accueil";
}

function AppLayout() {
    const sectionTitle = useActiveSectionTitle();
    useHead({ title: sectionTitle });

    return (
        <TooltipProvider>
            <SidebarProvider>
                <AppSidebar />
                <SidebarInset>
                    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
                        <SidebarTrigger className="-ml-1" />
                        <Separator
                            orientation="vertical"
                            className="mr-2 data-[orientation=vertical]:h-4"
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
                    </header>
                    <div className="flex flex-1 flex-col">
                        <Outlet />
                    </div>
                </SidebarInset>
            </SidebarProvider>
        </TooltipProvider>
    );
}
