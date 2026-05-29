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
    await page.goto("/messages");
    await expect(page).toHaveURL(/\/login/);
});

test.describe("Client — Messages", () => {
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
        await page.goto("/messages");
        await expect(page).toHaveURL(/\/messages/);
    });

    test("shows messages page with sidebar heading", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await expect(page.locator("h1")).toContainText(/messages/i);
        await expect(page.locator("h2")).toContainText(/conversations/i);
    });

    test("shows no errors when authenticated", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await expect(page.locator("body")).not.toContainText("Cannot");
        await expect(page.locator("body")).not.toContainText("Erreur de chargement");
    });
});
