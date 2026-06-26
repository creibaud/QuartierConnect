import { expect, test } from "@playwright/test";
import {
    apiLogin,
    apiRegister,
    injectTokens,
    isConnectionError,
    uniqueEmail,
} from "../helpers/auth";

const API = process.env.API_URL ?? "http://localhost:5000";

test.use({ baseURL: "http://localhost:3000" });

test("redirects unauthenticated user to /login", async ({ page }) => {
    await page.goto("/incidents/some-incident-id");
    await expect(page).toHaveURL(/\/login/);
});

test.describe("Client — Détail d'un incident", () => {
    let accessToken: string;
    let refreshToken: string;
    let incidentId: string;
    let apiAvailable = false;

    test.beforeAll(async () => {
        try {
            const email = uniqueEmail();
            const secret = await apiRegister(email);
            const tokens = await apiLogin(email, secret);
            accessToken = tokens.accessToken;
            refreshToken = tokens.refreshToken;

            const res = await fetch(`${API}/incidents`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    title: "Incident Détail E2E",
                    description: "Test Playwright detail",
                }),
            });
            const data = await res.json();
            const created = Array.isArray(data) ? data[0] : data;
            incidentId = created?.id ?? created?._id;
            apiAvailable = !!incidentId;
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
    });

    test("shows incident title on detail page", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await page.goto(`/incidents/${incidentId}`);
        await page.waitForLoadState("networkidle");
        await expect(page.getByText("Incident Détail E2E")).toBeVisible({
            timeout: 10000,
        });
    });

    test("shows incident status badge", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await page.goto(`/incidents/${incidentId}`);
        await page.waitForLoadState("networkidle");
        await expect(page.getByText(/ouvert|en cours|résolu/i)).toBeVisible({
            timeout: 10000,
        });
    });

    test("shows vote controls (up/down)", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await page.goto(`/incidents/${incidentId}`);
        await page.waitForLoadState("networkidle");
        // Vote buttons render an icon + the count; match the button carrying a digit
        await expect(
            page.getByRole("button").filter({ hasText: /\d/ }).first(),
        ).toBeVisible({ timeout: 10000 });
    });

    test("back link navigates to incidents list", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await page.goto(`/incidents/${incidentId}`);
        await page.waitForLoadState("networkidle");
        // Navigate back to the list via the sidebar nav link (an <a>, unlike the breadcrumb <span>)
        await page.locator('a[href="/incidents"]').first().click();
        await expect(page).toHaveURL(/\/incidents$/);
    });

    test("shows error message for non-existent incident", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await page.goto("/incidents/00000000-0000-0000-0000-000000000000");
        await page.waitForLoadState("networkidle");
        await expect(
            page.getByText(/introuvable|erreur de chargement|not found/i),
        ).toBeVisible({ timeout: 10000 });
    });
});
