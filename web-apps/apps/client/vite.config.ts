import path from "path";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    server: { port: 3000 },
    plugins: [
        TanStackRouterVite({ target: "react", autoCodeSplitting: true }),
        react(),
        tailwindcss(),
    ],
    resolve: {
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
            "@workspace/ui": path.resolve(__dirname, "../../packages/ui/src"),
        },
    },
});
