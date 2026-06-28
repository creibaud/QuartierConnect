import { expect, test } from "@playwright/test";
import {
    apiLogin,
    apiRegister,
    injectTokens,
    isConnectionError,
    uniqueEmail,
} from "../helpers/auth";

const BASE_URL = "http://localhost:3000";

test.use({ baseURL: BASE_URL });

test("redirects unauthenticated user to /login", async ({ page }) => {
    await page.goto("/points");
    await expect(page).toHaveURL(/\/login/);
});

test.describe("Client — Points", () => {
    let accessToken: string;
    let refreshToken: string;
    let recipientEmail: string;
    let apiAvailable = false;

    test.beforeAll(async () => {
        try {
            const senderEmail = uniqueEmail();
            const senderSecret = await apiRegister(senderEmail);
            const tokens = await apiLogin(senderEmail, senderSecret);
            accessToken = tokens.accessToken;
            refreshToken = tokens.refreshToken;

            // A second resident the sender can find and transfer to.
            recipientEmail = uniqueEmail();
            await apiRegister(recipientEmail);

            apiAvailable = true;
        } catch (err) {
            if (!isConnectionError(err)) throw err;
            // API not running — API-dependent tests will be skipped
        }
    });

    test.beforeEach(async ({ page }) => {
        if (!apiAvailable) return;
        await injectTokens(page, BASE_URL, accessToken, refreshToken);
        await page.goto("/points");
        await expect(page).toHaveURL(/\/points/);
    });

    test("displays points heading and transfer card", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await expect(
            page.getByRole("heading", { name: /points/i, level: 1 }),
        ).toBeVisible();
        await expect(page.getByText(/transférer des points/i)).toBeVisible();
    });

    test("recipient search finds a resident by email", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await page.getByRole("combobox").click();
        await page
            .getByPlaceholder(/rechercher par email/i)
            .fill(recipientEmail);
        await expect(
            page.getByRole("option", { name: recipientEmail }),
        ).toBeVisible();
    });

    test("transfers points to a recipient picked by email", async ({
        page,
    }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");

        await page.getByRole("combobox").click();
        await page
            .getByPlaceholder(/rechercher par email/i)
            .fill(recipientEmail);
        await page.getByRole("option", { name: recipientEmail }).click();

        // Trigger now shows the resolved email instead of a UUID.
        await expect(
            page.getByRole("combobox").filter({ hasText: recipientEmail }),
        ).toBeVisible();

        await page.getByLabel(/montant/i).fill("5");
        await page.getByLabel(/note/i).fill("Merci e2e");
        await page
            .getByRole("button", { name: "Transférer", exact: true })
            .click();

        // Success toast + history row shows the recipient's email, not a UUID.
        await expect(page.getByText(/points transférés/i)).toBeVisible();
        await expect(
            page.getByText(new RegExp(`Envoyé à\\s*${recipientEmail}`)),
        ).toBeVisible();
    });
});
