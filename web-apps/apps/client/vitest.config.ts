import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
    plugins: [react()],
    test: {
        environment: "jsdom",
        globals: true,
        setupFiles: ["./src/test-setup.ts"],
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
            "@workspace/shared": path.resolve(
                __dirname,
                "../../packages/shared/src",
            ),
            "@workspace/ui": path.resolve(__dirname, "../../packages/ui/src"),
        },
    },
});
