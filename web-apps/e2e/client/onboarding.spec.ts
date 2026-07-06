import { expect, test, type Page } from "@playwright/test";
import {
    apiLogin,
    apiRegister,
    assignAddress,
    assignUncoveredAddress,
    injectTokens,
    isConnectionError,
    uniqueEmail,
} from "../helpers/auth";

const BASE_URL = "http://localhost:3000";

test.use({ baseURL: BASE_URL });

/** Silence the debounced Nominatim autocomplete so tests never hit geocoding. */
async function stubGeocodingSearch(page: Page) {
    await page.route("**/api/geocoding/search**", (route) =>
        route.fulfill({ json: [] }),
    );
}

/** Stub the POST /users/me/address submission with a canned gate result. */
async function stubAddressSubmit(
    page: Page,
    result: {
        status: "assigned" | "pending" | "not_found";
        neighborhoodId?: string | null;
        displayName?: string;
    },
) {
    await page.route("**/api/users/me/address", async (route) => {
        if (route.request().method() !== "POST") return route.fallback();
        await route.fulfill({ json: result });
    });
}

async function submitAddress(page: Page, address: string) {
    await page.goto("/onboarding/address");
    await page.getByLabel("Votre adresse").fill(address);
    await page
        .getByRole("button", { name: "Confirmer mon adresse" })
        .click();
}

test.describe("Client — Onboarding : gate d'adresse", () => {
    let accessToken: string;
    let refreshToken: string;
    let apiAvailable = false;

    test.beforeAll(async () => {
        try {
            // No assignAddress: the user must stay behind the gate.
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
        await injectTokens(page, BASE_URL, accessToken, refreshToken);
    });

    test("redirects a user without address to /onboarding/address", async ({
        page,
    }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await page.goto("/dashboard");
        await expect(page).toHaveURL(/\/onboarding\/address/);
        await expect(page.getByLabel("Votre adresse")).toBeVisible();
    });

    test("assigned address confirms then lands on the dashboard", async ({
        page,
    }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await stubGeocodingSearch(page);
        await stubAddressSubmit(page, {
            status: "assigned",
            neighborhoodId: "x",
            displayName: "12 rue Test",
        });
        await page.route("**/api/users/me/neighborhood-status", (route) =>
            route.fulfill({ json: { hasAddress: true, neighborhoodId: "x" } }),
        );

        await submitAddress(page, "12 rue Test, 75012 Paris");

        await expect(page.getByText("Adresse reconnue :")).toBeVisible();
        await expect(page.getByText("12 rue Test", { exact: true })).toBeVisible();
        // The confirmation screen holds 1.2s before navigating home.
        await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
    });

    test("pending address routes to /onboarding/pending", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await stubGeocodingSearch(page);
        await stubAddressSubmit(page, {
            status: "pending",
            neighborhoodId: null,
            displayName: "1 rue Isolée",
        });

        await submitAddress(page, "1 rue Isolée, 99999 Nullepart");

        await expect(page).toHaveURL(/\/onboarding\/pending/, {
            timeout: 10_000,
        });
    });

    test("unknown address shows an error toast and stays on the gate", async ({
        page,
    }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await stubGeocodingSearch(page);
        await stubAddressSubmit(page, { status: "not_found" });

        await submitAddress(page, "adresse totalement inconnue");

        await expect(
            page.getByText(/adresse introuvable\. vérifiez et réessayez\./i),
        ).toBeVisible();
        await expect(page).toHaveURL(/\/onboarding\/address/);
        await expect(
            page.getByRole("button", { name: "Confirmer mon adresse" }),
        ).toBeVisible();
    });
});

test.describe("Client — Onboarding : adresse hors couverture", () => {
    let email: string;
    let accessToken: string;
    let refreshToken: string;
    let apiAvailable = false;

    test.beforeAll(async () => {
        try {
            email = uniqueEmail();
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
        await injectTokens(page, BASE_URL, accessToken, refreshToken);
    });

    test("routes to the pending page and offers to fix the address", async ({
        page,
    }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        assignUncoveredAddress(email);

        await page.goto("/dashboard");
        await expect(page).toHaveURL(/\/onboarding\/pending/);
        await expect(
            page.getByText(/aucun quartier ne couvre encore votre adresse/i),
        ).toBeVisible();

        await page
            .getByRole("button", { name: "Corriger mon adresse" })
            .click();
        await expect(page).toHaveURL(/\/onboarding\/address/);
    });

    test("regains dashboard access once the address is covered", async ({
        page,
    }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        assignAddress(email);

        await page.goto("/dashboard");
        await expect(page).toHaveURL(/\/dashboard/);
    });
});
