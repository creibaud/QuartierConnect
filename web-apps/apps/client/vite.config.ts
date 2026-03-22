import path from "path";
import { defineConfig } from "vite";
import { intlayer } from "vite-intlayer";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        intlayer(),
        tanstackRouter({
            target: "react",
            autoCodeSplitting: true,
        }),
        react(),
        tailwindcss(),
    ],
    resolve: {
        alias: [
            {
                find: /^@workspace\/auth\/(.*)/,
                replacement:
                    path.resolve(__dirname, "../../packages/auth/src") + "/$1",
            },
            {
                find: /^@workspace\/ui\/(.*)/,
                replacement:
                    path.resolve(__dirname, "../../packages/ui/src") + "/$1",
            },
            { find: "@", replacement: path.resolve(__dirname, "./src") },
        ],
        dedupe: [
            "react",
            "react-dom",
            "react-intlayer",
            "intlayer",
            "@tanstack/react-form",
            "@tanstack/react-query",
        ],
    },
    server: {
        port: 5174,
        strictPort: true,
    },
});
