import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import "@workspace/ui/globals.css";
import "./admin.css";
import "@workspace/shared/lib/i18n/index";
import { routeTree } from "./routeTree.gen";

const queryClient = new QueryClient();

const basepath = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";
const router = createRouter({ routeTree, basepath });

declare module "@tanstack/react-router" {
    interface Register {
        router: typeof router;
    }
}

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
        </QueryClientProvider>
    </StrictMode>,
);
