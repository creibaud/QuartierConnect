import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@workspace/shared": path.resolve(__dirname, "../../packages/shared/src"),
            "@workspace/ui": path.resolve(__dirname, "../../packages/ui/src"),
        },
    },
    test: {
        environment: "node",
        include: ["src/**/*.test.ts", "src/**/*.spec.ts", "src/**/*.test.tsx", "src/**/*.spec.tsx"],
        environmentMatchGlobs: [
            ["src/**/*.test.tsx", "jsdom"],
            ["src/**/*.spec.tsx", "jsdom"],
        ],
        setupFiles: ["./src/test-setup.ts"],
    },
});
