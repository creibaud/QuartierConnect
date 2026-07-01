import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "jsdom",
        globals: true,
        setupFiles: [],
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
