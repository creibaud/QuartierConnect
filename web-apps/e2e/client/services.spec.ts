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
    await page.goto("/services");
    await expect(page).toHaveURL(/\/login/);
});

test.describe("Client — Services", () => {
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
        await page.goto("/services");
        await expect(page).toHaveURL(/\/services/);
    });

    test("displays services page heading", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await expect(
            page.getByRole("heading", { name: /services/i }),
        ).toBeVisible();
    });

    test("shows neighbourhood filter selector", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await expect(page.getByRole("combobox")).toBeVisible();
    });

    test("filter selector contains 'Tous les quartiers' option", async ({
        page,
    }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await page.getByRole("combobox").click();
        await expect(page.getByRole("option", { name: /tous/i })).toBeVisible();
    });

    test("page loads without error state", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await expect(page.getByText(/erreur|error/i)).not.toBeVisible();
    });
});
