import { expect, test } from "@playwright/test";
import {
    apiLogin,
    apiRegister,
    injectTokens,
    isConnectionError,
    uniqueEmail,
} from "../helpers/auth";

test.use({ baseURL: "http://localhost:3000" });

test.describe("Client — Dashboard", () => {
    let testEmail: string;
    let testSecret: string;
    let savedAccessToken: string;
    let savedRefreshToken: string;
    let apiAvailable = false;

    test.beforeAll(async () => {
        try {
            testEmail = uniqueEmail();
            testSecret = await apiRegister(testEmail);
            const tokens = await apiLogin(testEmail, testSecret);
            savedAccessToken = tokens.accessToken;
            savedRefreshToken = tokens.refreshToken;
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
            savedAccessToken,
            savedRefreshToken,
        );
        await page.goto("/dashboard");
        await expect(page).toHaveURL(/\/dashboard/);
    });

    test("displays user email on dashboard", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await expect(page.getByRole("main").getByText(testEmail)).toBeVisible();
    });

    test("generates and displays SSO token", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await page.getByRole("button", { name: /générer|sso/i }).click();
        await expect(page.getByText(/[0-9a-f]{8}-[0-9a-f]{4}/i)).toBeVisible();
    });

    test("logout redirects to /login", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        // Logout lives in the nav-user dropdown: open it (trigger shows the email), then click the menuitem
        await page.getByRole("button").filter({ hasText: testEmail }).click();
        await page
            .getByRole("menuitem", { name: /déconnexion|déconnecter|logout/i })
            .click();
        await expect(page).toHaveURL(/\/login/);
    });
});
