import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createHead, UnheadProvider } from "@unhead/react/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import "@workspace/ui/globals.css";
import "./client.css";
import "@workspace/shared/lib/i18n/index";
import { routeTree } from "./routeTree.gen";

const queryClient = new QueryClient();

const head = createHead();

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
    interface Register {
        router: typeof router;
    }
}

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <UnheadProvider head={head}>
            <QueryClientProvider client={queryClient}>
                <RouterProvider router={router} />
            </QueryClientProvider>
        </UnheadProvider>
    </StrictMode>,
);
