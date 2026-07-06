import { expect, test } from "@playwright/test";
import {
    apiRegister,
    currentTotp,
    DEMO_PASSWORD,
    extractSecret,
    isConnectionError,
    uniqueEmail,
} from "../helpers/auth";

test.use({ baseURL: "http://localhost:3000" });

test.describe("Client — Register parcours", () => {
    let apiAvailable = false;

    test.beforeAll(async () => {
        try {
            await apiRegister(uniqueEmail());
            apiAvailable = true;
        } catch (err) {
            if (!isConnectionError(err)) throw err;
            // API not running — API-dependent tests will be skipped
        }
    });

    test("shows error and keeps submit disabled when passwords do not match", async ({
        page,
    }) => {
        await page.goto("/register");
        await page.getByLabel("Prénom", { exact: true }).fill("Test");
        await page.getByLabel("Nom", { exact: true }).fill("Resident");
        await page.getByLabel("Email").fill(uniqueEmail());
        await page
            .getByLabel("Mot de passe", { exact: true })
            .fill(DEMO_PASSWORD);
        await page.getByLabel(/confirmer/i).fill("Different1!");
        await page.getByRole("checkbox").check();
        // Live validation: the mismatch error shows without submitting
        await expect(page.getByRole("alert")).toContainText(
            /correspondent pas/i,
        );
        await expect(
            page.getByRole("button", { name: /créer/i }),
        ).toBeDisabled();
    });

    test("shows email format error on blur", async ({ page }) => {
        await page.goto("/register");
        // Field errors are validated per field, so several can coexist — scope
        // the assertion to the email error itself.
        await page.getByLabel("Email").fill("pas-un-email");
        await page.getByLabel("Email").blur();
        await expect(page.getByText(/email invalide/i)).toBeVisible();
    });

    test("a single cold click toggles consent without a layout shift", async ({
        page,
    }) => {
        // Regression guard: validating the autofocused first field used to
        // insert an error node that shifted the layout mid-click, so the very
        // first click on the checkbox was swallowed.
        await page.goto("/register");
        const consent = page.getByRole("checkbox");
        await expect(consent).not.toBeChecked();
        await consent.click();
        await expect(consent).toBeChecked();
    });

    test("submit stays disabled until every field is valid", async ({
        page,
    }) => {
        await page.goto("/register");
        const submit = page.getByRole("button", { name: /créer/i });
        // A single click on the freshly loaded page toggles consent (the form
        // reserves the error line height, so validation never shifts it).
        const consent = page.getByRole("checkbox");
        await consent.click();
        await expect(consent).toBeChecked();
        await expect(submit).toBeDisabled();
        await page.getByLabel("Prénom", { exact: true }).fill("Test");
        await page.getByLabel("Nom", { exact: true }).fill("Resident");
        await page.getByLabel("Email").fill("pas-un-email");
        await page
            .getByLabel("Mot de passe", { exact: true })
            .fill(DEMO_PASSWORD);
        await page.getByLabel(/confirmer/i).fill(DEMO_PASSWORD);
        await expect(submit).toBeDisabled();
        await page.getByLabel("Email").fill(uniqueEmail());
        await expect(submit).toBeEnabled();
    });

    test("register inputs expose autocomplete hints", async ({ page }) => {
        await page.goto("/register");
        await expect(
            page.getByLabel("Prénom", { exact: true }),
        ).toHaveAttribute("autocomplete", "given-name");
        await expect(page.getByLabel("Nom", { exact: true })).toHaveAttribute(
            "autocomplete",
            "family-name",
        );
        await expect(page.getByLabel("Email")).toHaveAttribute(
            "autocomplete",
            "email",
        );
        await expect(
            page.getByLabel("Mot de passe", { exact: true }),
        ).toHaveAttribute("autocomplete", "new-password");
        await expect(page.getByLabel(/confirmer/i)).toHaveAttribute(
            "autocomplete",
            "new-password",
        );
    });

    test("consent notice dialog closes with a French close button", async ({
        page,
    }) => {
        await page.goto("/register");
        const trigger = page.getByRole("button", {
            name: /notice d'information/i,
        });
        await expect(trigger).toBeVisible();
        // A single cold click opens the dialog: the reserved error line means
        // no layout shift steals the click.
        await trigger.click();
        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible();
        await dialog.getByRole("button", { name: "Fermer" }).click();
        await expect(dialog).not.toBeVisible();
    });

    test("shows QR code after successful registration", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await page.goto("/register");
        await page.getByLabel("Prénom", { exact: true }).fill("Test");
        await page.getByLabel("Nom", { exact: true }).fill("Resident");
        await page.getByLabel("Email").fill(uniqueEmail());
        await page
            .getByLabel("Mot de passe", { exact: true })
            .fill(DEMO_PASSWORD);
        await page.getByLabel(/confirmer/i).fill(DEMO_PASSWORD);
        await page.getByRole("checkbox").check();
        await page.getByRole("button", { name: /créer/i }).click();
        await expect(page.getByTestId("totp-qr")).toBeVisible({
            timeout: 20000,
        });
        // Two i18n strings start with "Scannez" (QR heading + hint) — scope to
        // the first so strict mode doesn't flag the 2-element match.
        await expect(page.getByText(/scannez/i).first()).toBeVisible();
    });

    test("submit stays disabled until consent is given", async ({ page }) => {
        await page.goto("/register");
        await page.getByLabel("Prénom", { exact: true }).fill("Test");
        await page.getByLabel("Nom", { exact: true }).fill("Resident");
        await page.getByLabel("Email").fill(uniqueEmail());
        await page
            .getByLabel("Mot de passe", { exact: true })
            .fill(DEMO_PASSWORD);
        await page.getByLabel(/confirmer/i).fill(DEMO_PASSWORD);
        await expect(
            page.getByRole("button", { name: /créer/i }),
        ).toBeDisabled();
        await page.getByRole("checkbox").check();
        await expect(
            page.getByRole("button", { name: /créer/i }),
        ).toBeEnabled();
    });

    test("shows error on duplicate email", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        const email = uniqueEmail();

        await page.goto("/register");
        await page.getByLabel("Prénom", { exact: true }).fill("Test");
        await page.getByLabel("Nom", { exact: true }).fill("Resident");
        await page.getByLabel("Email").fill(email);
        await page
            .getByLabel("Mot de passe", { exact: true })
            .fill(DEMO_PASSWORD);
        await page.getByLabel(/confirmer/i).fill(DEMO_PASSWORD);
        await page.getByRole("checkbox").check();
        await page.getByRole("button", { name: /créer/i }).click();
        await expect(page.getByTestId("totp-qr")).toBeVisible({
            timeout: 20000,
        });

        await page.goto("/register");
        await page.getByLabel("Prénom", { exact: true }).fill("Test");
        await page.getByLabel("Nom", { exact: true }).fill("Resident");
        await page.getByLabel("Email").fill(email);
        await page
            .getByLabel("Mot de passe", { exact: true })
            .fill(DEMO_PASSWORD);
        await page.getByLabel(/confirmer/i).fill(DEMO_PASSWORD);
        await page.getByRole("checkbox").check();
        await page.getByRole("button", { name: /créer/i }).click();
        await expect(page.getByRole("alert")).toContainText(/déjà utilisée/i);
    });

    test("full registration → TOTP confirm → address onboarding", async ({
        page,
    }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        const email = uniqueEmail();
        await page.goto("/register");
        await page.getByLabel("Prénom", { exact: true }).fill("Test");
        await page.getByLabel("Nom", { exact: true }).fill("Resident");
        await page.getByLabel("Email").fill(email);
        await page
            .getByLabel("Mot de passe", { exact: true })
            .fill(DEMO_PASSWORD);
        await page.getByLabel(/confirmer/i).fill(DEMO_PASSWORD);
        await page.getByRole("checkbox").check();

        let totpSecret: string | null = null;
        page.on("response", async (resp) => {
            if (
                resp.url().includes("/auth/register") &&
                resp.status() === 201
            ) {
                const body = (await resp.json()) as { otpauthUrl?: string };
                if (body.otpauthUrl) {
                    try {
                        totpSecret = extractSecret(body.otpauthUrl);
                    } catch {}
                }
            }
        });

        await page.getByRole("button", { name: /créer/i }).click();
        await expect(page.getByTestId("totp-qr")).toBeVisible({
            timeout: 20000,
        });

        if (totpSecret) {
            // input-otp ignores .fill(); type the digits — the 6th auto-submits
            await page
                .getByLabel(/code de vérification/i)
                .pressSequentially(currentTotp(totpSecret));
            // New user has no address yet → the gate routes to onboarding
            await expect(page).toHaveURL(/\/onboarding\/address/);
        } else {
            await expect(
                page.getByLabel(/code de vérification/i),
            ).toBeVisible();
        }
    });
});
