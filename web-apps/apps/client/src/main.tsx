import ReactDOM from "react-dom/client";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { routeTree } from "@/routeTree.gen";
import "@workspace/ui/styles/globals.css";
import { IntlayerProvider } from "react-intlayer";
import { AuthProvider, useAuth } from "@workspace/auth/context";

const router = createRouter({
    routeTree,
    defaultPreload: "intent",
    scrollRestoration: true,
    context: { auth: undefined! },
});

declare module "@tanstack/react-router" {
    interface Register {
        router: typeof router;
    }
}

function App() {
    const auth = useAuth();

    if (auth.isLoading) {
        return null;
    }

    return <RouterProvider context={{ auth }} router={router} />;
}

const rootElement = document.getElementById("root")!;

if (!rootElement.innerHTML) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
        <IntlayerProvider>
            <AuthProvider>
                <App />
            </AuthProvider>
        </IntlayerProvider>,
    );
}
