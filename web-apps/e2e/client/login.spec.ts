import { expect, test } from "@playwright/test";
import {
    apiRegister,
    currentTotp,
    DEMO_PASSWORD,
    isConnectionError,
    uniqueEmail,
} from "../helpers/auth";

test.use({ baseURL: "http://localhost:3000" });

test("redirects unauthenticated user to /login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
});

test.describe("Client — Login parcours", () => {
    let testEmail: string;
    let testSecret: string;
    let apiAvailable = false;

    test.beforeAll(async () => {
        try {
            testEmail = uniqueEmail();
            testSecret = await apiRegister(testEmail);
            apiAvailable = true;
        } catch (err) {
            if (!isConnectionError(err)) throw err;
            // API not running — API-dependent tests will be skipped
        }
    });

    test("shows TOTP step after valid credentials", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await page.goto("/login");
        await page.getByLabel("Email").fill(testEmail);
        await page.getByLabel("Mot de passe").fill(DEMO_PASSWORD);
        await page.getByRole("button", { name: /continuer/i }).click();
        await expect(page.getByLabel(/code totp/i)).toBeVisible();
    });

    test("shows error on wrong password", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await page.goto("/login");
        await page.getByLabel("Email").fill(testEmail);
        await page.getByLabel("Mot de passe").fill("WrongPass999!");
        await page.getByRole("button", { name: /continuer/i }).click();
        await page.getByLabel(/code totp/i).fill("000000");
        await page.getByRole("button", { name: /se connecter/i }).click();
        await expect(page.getByRole("alert")).toContainText(
            /incorrect|invalide/i,
        );
    });

    test("redirects to /dashboard after valid login", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await page.goto("/login");
        await page.getByLabel("Email").fill(testEmail);
        await page.getByLabel("Mot de passe").fill(DEMO_PASSWORD);
        await page.getByRole("button", { name: /continuer/i }).click();
        await page.getByLabel(/code totp/i).fill(currentTotp(testSecret));
        await page.getByRole("button", { name: /se connecter/i }).click();
        await expect(page).toHaveURL(/\/dashboard/);
    });
});
