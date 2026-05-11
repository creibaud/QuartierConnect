import { test } from "@playwright/test";
import { mkdirSync } from "fs";
import { resolve } from "path";

const SHOTS_DIR = resolve(__dirname, "../../test-results/redesign-baseline");
mkdirSync(SHOTS_DIR, { recursive: true });

test.describe("Civic Editorial — baseline screenshots", () => {
    test("client /login", async ({ page }) => {
        await page.goto("http://localhost:3000/login");
        await page.waitForLoadState("networkidle");
        await page.screenshot({
            path: `${SHOTS_DIR}/client-login.png`,
            fullPage: true,
        });
    });

    test("client /register", async ({ page }) => {
        await page.goto("http://localhost:3000/register");
        await page.waitForLoadState("networkidle");
        await page.screenshot({
            path: `${SHOTS_DIR}/client-register.png`,
            fullPage: true,
        });
    });

    test("admin /login", async ({ page }) => {
        await page.goto("http://localhost:3001/login");
        await page.waitForLoadState("networkidle");
        await page.screenshot({
            path: `${SHOTS_DIR}/admin-login.png`,
            fullPage: true,
        });
    });
});
