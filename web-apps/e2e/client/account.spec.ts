import { expect, test } from "@playwright/test";
import {
    DEMO_PASSWORD,
    apiLogin,
    apiRegister,
    assignAddress,
    currentTotp,
    injectTokens,
    isConnectionError,
    uniqueEmail,
} from "../helpers/auth";

const BASE_URL = "http://localhost:3000";
const NEW_PASSWORD = "NouveauDemo5678!";
const WRONG_CURRENT_PASSWORD = "MauvaisMdp0000!";
const NEXT_TOTP_WINDOW_SECONDS = 30;

test.use({ baseURL: BASE_URL });

test.describe("Client — Compte (/settings)", () => {
    let email: string;
    let secret: string;
    let accessToken: string;
    let refreshToken: string;
    let apiAvailable = false;

    test.beforeAll(async () => {
        try {
            email = uniqueEmail();
            secret = await apiRegister(email);
            // Pass the address gate so the user can reach /settings
            assignAddress(email);
            // -30 frees the current TOTP window for the password-change test.
            const tokens = await apiLogin(email, secret, -30);
            accessToken = tokens.accessToken;
            refreshToken = tokens.refreshToken;
            apiAvailable = true;
        } catch (err) {
            if (!isConnectionError(err)) throw err;
            // API not running, dependent tests are skipped
        }
    });

    test.beforeEach(async ({ page }) => {
        if (!apiAvailable) return;
        await injectTokens(page, BASE_URL, accessToken, refreshToken);
        await page.goto("/settings");
        await expect(page).toHaveURL(/\/settings/);
    });

    test("displays the account header with profile and security cards", async ({
        page,
    }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");

        await expect(
            page.getByRole("heading", { name: "Mon compte", level: 1 }),
        ).toBeVisible();
        await expect(page.getByText("Profil", { exact: true })).toBeVisible();
        await expect(page.getByText("Sécurité", { exact: true })).toBeVisible();
    });

    test("edits first and last name, persisted after reload", async ({
        page,
    }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");

        // The profile card is the first card carrying a "Modifier" button
        await page.getByRole("button", { name: "Modifier" }).first().click();
        await page.getByLabel("Prénom").fill("Camille");
        await page.getByLabel("Nom", { exact: true }).fill("Testeur");
        await page.getByRole("button", { name: "Enregistrer" }).click();

        await expect(page.getByText("Profil mis à jour.")).toBeVisible();

        await page.reload();
        await expect(page.getByText("Camille Testeur").first()).toBeVisible();
    });

    test("changes the password with current password and TOTP code", async ({
        page,
    }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");

        await page.getByLabel("Mot de passe actuel").fill(DEMO_PASSWORD);
        await page
            .getByLabel("Nouveau mot de passe", { exact: true })
            .fill(NEW_PASSWORD);
        await page
            .getByLabel("Confirmer le nouveau mot de passe")
            .fill(NEW_PASSWORD);
        // input-otp ignores .fill(); type the digits
        await page
            .getByLabel("Code de vérification (TOTP)")
            .pressSequentially(currentTotp(secret));
        await page
            .getByRole("button", { name: "Mettre à jour le mot de passe" })
            .click();

        await expect(page.getByText("Mot de passe mis à jour.")).toBeVisible();

        // Next TOTP window (+30s) was never consumed, so the replay guard accepts it.
        const tokens = await apiLogin(
            email,
            secret,
            NEXT_TOTP_WINDOW_SECONDS,
            NEW_PASSWORD,
        );
        expect(tokens.accessToken).toBeTruthy();
        // Re-login rotated the refresh token; keep it for later tests.
        accessToken = tokens.accessToken;
        refreshToken = tokens.refreshToken;
    });

    test("shows a readable French error on wrong current password", async ({
        page,
    }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");

        // A valid qc_rt cookie lets the 401 retry refresh instead of logging out.
        await page
            .context()
            .addCookies([{ name: "qc_rt", value: refreshToken, url: BASE_URL }]);

        await page
            .getByLabel("Mot de passe actuel")
            .fill(WRONG_CURRENT_PASSWORD);
        await page
            .getByLabel("Nouveau mot de passe", { exact: true })
            .fill("AutreDemo9999!");
        await page
            .getByLabel("Confirmer le nouveau mot de passe")
            .fill("AutreDemo9999!");
        // The API rejects the current password before checking the TOTP code
        await page
            .getByLabel("Code de vérification (TOTP)")
            .pressSequentially("000000");
        await page
            .getByRole("button", { name: "Mettre à jour le mot de passe" })
            .click();

        await expect(
            page.getByText("Mot de passe actuel incorrect."),
        ).toBeVisible();
        await expect(page).toHaveURL(/\/settings/);
    });
});
