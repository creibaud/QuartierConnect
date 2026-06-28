import { readFileSync } from "fs";
import { resolve } from "path";
import { defineConfig, devices } from "@playwright/test";

try {
    const envFile = readFileSync(resolve(__dirname, "../.env"), "utf-8");
    for (const line of envFile.split("\n")) {
        const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
        if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
    }
} catch {
    // .env not found — env vars must be set externally
}

export default defineConfig({
    testDir: "./e2e",
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: 1,
    reporter: process.env.CI
        ? [["line"], ["html", { open: "never" }]]
        : "line",
    timeout: 30_000,
    use: {
        trace: "on-first-retry",
        headless: true,
    },
    webServer: [
        {
            command: "pnpm --filter client dev",
            url: "http://localhost:3000",
            reuseExistingServer: true,
            timeout: 120_000,
        },
        {
            command: "pnpm --filter admin dev",
            url: "http://localhost:3001",
            reuseExistingServer: true,
            timeout: 120_000,
        },
    ],
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
    ],
});
