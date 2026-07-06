import { expect, test } from "@playwright/test";
import { mkdirSync } from "fs";
import { resolve } from "path";

const SHOTS_DIR = resolve(__dirname, "../../test-results/redesign-baseline");
const ADMIN_BASE_URL =
    process.env.PLAYWRIGHT_BASE_URL_ADMIN ?? "http://localhost:3001/";

mkdirSync(SHOTS_DIR, { recursive: true });

test.describe("Civic Editorial — baseline screenshots", () => {
    test("client /login", async ({ page }) => {
        await page.goto("http://localhost:3000/login");
        await page.waitForLoadState("networkidle");
        await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
        await expect(
            page.getByLabel("Mot de passe", { exact: true }),
        ).toBeVisible();
        await page.screenshot({
            path: `${SHOTS_DIR}/client-login.png`,
            fullPage: true,
        });
    });

    test("client /register", async ({ page }) => {
        await page.goto("http://localhost:3000/register");
        await page.waitForLoadState("networkidle");
        await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
        await expect(
            page.getByRole("checkbox", {
                name: /J'accepte les conditions d'utilisation/,
            }),
        ).toBeVisible();
        await page.screenshot({
            path: `${SHOTS_DIR}/client-register.png`,
            fullPage: true,
        });
    });

    test("admin /login", async ({ page }) => {
        await page.goto(`${ADMIN_BASE_URL}login`);
        await page.waitForLoadState("networkidle");
        await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
        await page.screenshot({
            path: `${SHOTS_DIR}/admin-login.png`,
            fullPage: true,
        });
    });
});
