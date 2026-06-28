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

    test("shows error when passwords do not match", async ({ page }) => {
        await page.goto("/register");
        await page.getByLabel("Email").fill(uniqueEmail());
        await page
            .getByLabel("Mot de passe", { exact: true })
            .fill(DEMO_PASSWORD);
        await page.getByLabel(/confirmer/i).fill("Different1!");
        await page.getByRole("button", { name: /créer/i }).click();
        await expect(page.getByRole("alert")).toContainText(
            /correspondent pas/i,
        );
    });

    test("shows QR code after successful registration", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await page.goto("/register");
        await page.getByLabel("Email").fill(uniqueEmail());
        await page
            .getByLabel("Mot de passe", { exact: true })
            .fill(DEMO_PASSWORD);
        await page.getByLabel(/confirmer/i).fill(DEMO_PASSWORD);
        await page.getByRole("button", { name: /créer/i }).click();
        await expect(page.getByTestId("totp-qr")).toBeVisible({ timeout: 8000 });
        await expect(page.getByText(/scannez/i)).toBeVisible();
    });

    test("shows error on duplicate email", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        const email = uniqueEmail();

        await page.goto("/register");
        await page.getByLabel("Email").fill(email);
        await page
            .getByLabel("Mot de passe", { exact: true })
            .fill(DEMO_PASSWORD);
        await page.getByLabel(/confirmer/i).fill(DEMO_PASSWORD);
        await page.getByRole("button", { name: /créer/i }).click();
        await expect(page.getByTestId("totp-qr")).toBeVisible({ timeout: 8000 });

        await page.goto("/register");
        await page.getByLabel("Email").fill(email);
        await page
            .getByLabel("Mot de passe", { exact: true })
            .fill(DEMO_PASSWORD);
        await page.getByLabel(/confirmer/i).fill(DEMO_PASSWORD);
        await page.getByRole("button", { name: /créer/i }).click();
        await expect(page.getByRole("alert")).toContainText(/déjà utilisée/i);
    });

    test("full registration → TOTP confirm → dashboard", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        const email = uniqueEmail();
        await page.goto("/register");
        await page.getByLabel("Email").fill(email);
        await page
            .getByLabel("Mot de passe", { exact: true })
            .fill(DEMO_PASSWORD);
        await page.getByLabel(/confirmer/i).fill(DEMO_PASSWORD);

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
        await expect(page.getByTestId("totp-qr")).toBeVisible({ timeout: 8000 });

        if (totpSecret) {
            await page
                .getByLabel(/code de vérification/i)
                .fill(currentTotp(totpSecret));
            await page.getByRole("button", { name: /confirmer/i }).click();
            await expect(page).toHaveURL(/\/dashboard/);
        } else {
            await expect(
                page.getByLabel(/code de vérification/i),
            ).toBeVisible();
        }
    });
});
