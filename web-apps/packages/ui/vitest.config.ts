import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "jsdom",
        globals: true,
        setupFiles: ["./src/test/setup.ts"],
        css: false,
    },
    resolve: {
        alias: {
            "@workspace/ui": new URL("./src", import.meta.url).pathname,
        },
    },
});
