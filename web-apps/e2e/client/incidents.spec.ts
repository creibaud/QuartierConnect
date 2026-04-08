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
    await page.goto("/incidents");
    await expect(page).toHaveURL(/\/login/);
});

test.describe("Client — Incidents", () => {
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
        await page.goto("/incidents");
        await expect(page).toHaveURL(/\/incidents/);
    });

    test("displays incidents page heading", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await expect(
            page.getByRole("heading", { name: /incidents/i }),
        ).toBeVisible();
    });

    test("shows create incident button", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await expect(
            page.getByRole("button", { name: /signaler|nouveau|créer/i }),
        ).toBeVisible();
    });

    test("opens create incident dialog", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await page
            .getByRole("button", { name: /signaler|nouveau|créer/i })
            .click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await expect(page.getByLabel(/titre/i)).toBeVisible();
    });

    test("creates a new incident and it appears in the list", async ({
        page,
    }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        const title = `Incident E2E ${Date.now()}`;
        await page
            .getByRole("button", { name: /signaler|nouveau|créer/i })
            .click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await page.getByLabel(/titre/i).fill(title);
        await page
            .getByLabel(/description/i)
            .fill("Description de test Playwright");
        await page
            .getByRole("button", { name: /signaler|créer|soumettre|envoyer/i })
            .last()
            .click();
        await expect(page.getByRole("dialog")).not.toBeVisible({
            timeout: 5000,
        });
        await expect(page.getByText(title)).toBeVisible({ timeout: 8000 });
    });

    test("incident detail page is accessible from the list", async ({
        page,
    }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        const title = `Detail Nav ${Date.now()}`;
        await page
            .getByRole("button", { name: /signaler|nouveau|créer/i })
            .click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await page.getByLabel(/titre/i).fill(title);
        await page
            .getByLabel(/description/i)
            .fill("Description de test Playwright");
        await page
            .getByRole("button", { name: /signaler|créer|soumettre|envoyer/i })
            .last()
            .click();
        await expect(page.getByRole("dialog")).not.toBeVisible({
            timeout: 5000,
        });
        await expect(page.getByText(title)).toBeVisible({ timeout: 8000 });
        await page.getByText(title).click();
        await expect(page).toHaveURL(/\/incidents\/.+/);
    });
});
