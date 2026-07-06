import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { createHead, UnheadProvider } from "@unhead/react/client";
import "@workspace/ui/globals.css";
import "@workspace/ui/voisinage.css";
import "./admin.css";
import "@workspace/shared/lib/i18n/index";
import { NotFoundPage, RouterErrorPage } from "./components/router-fallback";
import { ThemeProvider } from "./components/theme-provider";
import { routeTree } from "./routeTree.gen";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            staleTime: 30_000,
        },
    },
});

const head = createHead();

const basepath = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";
const router = createRouter({
    routeTree,
    basepath,
    defaultNotFoundComponent: NotFoundPage,
    defaultErrorComponent: RouterErrorPage,
});

declare module "@tanstack/react-router" {
    interface Register {
        router: typeof router;
    }
}

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <ThemeProvider defaultTheme="system" storageKey="theme">
            <UnheadProvider head={head}>
                <QueryClientProvider client={queryClient}>
                    <RouterProvider router={router} />
                </QueryClientProvider>
            </UnheadProvider>
        </ThemeProvider>
    </StrictMode>,
);
