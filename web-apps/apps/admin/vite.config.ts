import path from "path";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
    base: mode === "production" ? "/admin/" : "/",
    server: {
        port: 3001,
        proxy: {
            "/api": {
                target: "http://localhost:5000",
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, ""),
            },
        },
    },
    plugins: [
        TanStackRouterVite({ target: "react", autoCodeSplitting: true }),
        react(),
        tailwindcss(),
    ],
    resolve: {
        // Force a single copy of i18next/react-i18next in the bundle. pnpm
        // resolves i18next twice (against different transitive typescript peers),
        // so without deduping the shared package inits one instance while the
        // app's useTranslation reads another — the prod build then renders raw
        // translation keys (e.g. "auth.password" instead of "Mot de passe").
        dedupe: ["i18next", "react-i18next"],
        alias: {
            "@": path.resolve(__dirname, "./src"),
            "@workspace/shared": path.resolve(
                __dirname,
                "../../packages/shared/src",
            ),
            "@workspace/ui/globals.css": path.resolve(
                __dirname,
                "../../packages/ui/src/styles/globals.css",
            ),
            "@workspace/ui/voisinage.css": path.resolve(
                __dirname,
                "../../packages/ui/src/styles/voisinage.css",
            ),
            "@workspace/ui": path.resolve(__dirname, "../../packages/ui/src"),
        },
    },
}));
