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
    await page.goto("/events");
    await expect(page).toHaveURL(/\/login/);
});

test.describe("Client — Événements", () => {
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
        await page.goto("/events");
        await expect(page).toHaveURL(/\/events/);
    });

    test("displays events page heading", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await expect(
            page.getByRole("heading", { name: /événements/i }),
        ).toBeVisible();
    });

    test("shows calendar view by default", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await expect(page.locator("[role='grid']")).toBeVisible();
    });

    test("switches to list view", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        const listButton = page.getByRole("button", { name: /liste/i });
        if (await listButton.isVisible()) {
            await listButton.click();
            await expect(page.locator("[role='grid']")).not.toBeVisible();
        }
    });

    test("shows create event button", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await expect(
            page.getByRole("button", { name: /créer|ajouter|nouvel/i }).first(),
        ).toBeVisible();
    });

    test("opens create event dialog", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await page
            .getByRole("button", { name: /créer|ajouter|nouvel/i }).first()
            .click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await expect(page.getByLabel(/titre/i)).toBeVisible();
    });
});
