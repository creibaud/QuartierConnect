import { expect, test } from "@playwright/test";
import {
    apiLogin,
    apiRegister,
    injectTokens,
    isConnectionError,
    uniqueEmail,
} from "../helpers/auth";

test.use({ baseURL: "http://localhost:3000" });

test("redirects unauthenticated user to /login", async ({ page }) => {
    await page.goto("/contracts");
    await expect(page).toHaveURL(/\/login/);
});

test.describe("Client — Contrats", () => {
    let accessToken: string;
    let refreshToken: string;
    let apiAvailable = false;

    test.beforeAll(async () => {
        try {
            const email = uniqueEmail();
            const secret = await apiRegister(email);
            const tokens = await apiLogin(email, secret);
            accessToken = tokens.accessToken;
            refreshToken = tokens.refreshToken;
            apiAvailable = true;
        } catch (err) {
            if (!isConnectionError(err)) throw err;
            // API not running — API-dependent tests will be skipped
        }
    });

    test.beforeEach(async ({ page }) => {
        if (!apiAvailable) return;
        await injectTokens(
            page,
            "http://localhost:3000",
            accessToken,
            refreshToken,
        );
        await page.goto("/contracts");
        await expect(page).toHaveURL(/\/contracts/);
    });

    test("displays contracts page heading", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await expect(
            page.getByRole("heading", { name: /contrats/i }),
        ).toBeVisible();
    });

    test("shows create contract button", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await expect(
            page.getByRole("button", { name: /créer|nouveau|proposer/i }),
        ).toBeVisible();
    });

    test("opens create contract dialog with required fields", async ({
        page,
    }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await page
            .getByRole("button", { name: /créer|nouveau|proposer/i })
            .click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await expect(page.getByLabel(/titre/i)).toBeVisible();
    });

    test("shows empty state or contract list without error", async ({
        page,
    }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await expect(page.getByText(/erreur|error/i)).not.toBeVisible();
        await expect(page.locator("body")).not.toContainText("Cannot");
    });
});
