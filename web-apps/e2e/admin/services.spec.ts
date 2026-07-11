import { execSync } from "child_process";
import { expect, test } from "@playwright/test";
import {
    apiLogin,
    apiRegister,
    injectTokens,
    uniqueEmail,
} from "../helpers/auth";

test.use({ baseURL: process.env.PLAYWRIGHT_BASE_URL_ADMIN ?? "http://localhost:3001/" });

test.describe("Admin — Services (CRUD)", () => {
    let adminAccessToken: string;
    let adminRefreshToken: string;
    let apiAvailable = false;

    test.beforeAll(async () => {
        try {
            const adminEmail = uniqueEmail();
            const adminSecret = await apiRegister(adminEmail);
            const pgUser = process.env.POSTGRES_USER ?? "qc";
            const pgDb = process.env.POSTGRES_DB ?? "quartierconnect";
            execSync(
                `docker exec docker-postgres-1 psql -U "${pgUser}" -d "${pgDb}" -c "UPDATE users SET role='admin' WHERE email='${adminEmail}'"`,
                { stdio: "pipe" },
            );
            const tokens = await apiLogin(adminEmail, adminSecret, -30);
            adminAccessToken = tokens.accessToken;
            adminRefreshToken = tokens.refreshToken;
            apiAvailable = true;
        } catch (err) {
            // no backend or docker, tests skip below
        }
    });

    test.beforeEach(async ({ page }) => {
        if (!apiAvailable) return;
        await injectTokens(
            page,
            "http://localhost:3001",
            adminAccessToken,
            adminRefreshToken,
        );
        await page.goto("services");
        await expect(page).toHaveURL(/\/services/);
    });

    test("shows services page heading", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await expect(
            page.getByRole("heading", { name: /services/i }),
        ).toBeVisible();
    });

    test("shows add service button", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await expect(
            page.getByRole("button", { name: /ajouter/i }).first(),
        ).toBeVisible();
    });

    test("creates a new service", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        const name = `Service E2E ${Date.now()}`;
        await page.getByRole("button", { name: /ajouter/i }).first().click();
        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible();
        await dialog.getByLabel(/nom/i).fill(name);
        await dialog.getByLabel(/catégorie/i).click();
        await page.getByRole("option", { name: "Autre" }).click();
        await dialog.getByLabel(/description/i).fill("Description de test E2E");
        await dialog.getByRole("button", { name: /créer/i }).click();
        await expect(dialog).not.toBeVisible({ timeout: 5000 });
        // Server-side pagination/sort may place the new row on another page.
        await page.getByPlaceholder("Rechercher par nom").fill(name);
        await expect(page.getByText(name)).toBeVisible({ timeout: 5000 });
    });

    test("edits an existing service", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        const original = `Service Edit ${Date.now()}`;
        const updated = `${original} MAJ`;

        await page.getByRole("button", { name: /ajouter/i }).first().click();
        const dialog = page.getByRole("dialog");
        await dialog.getByLabel(/nom/i).fill(original);
        await dialog.getByLabel(/catégorie/i).click();
        await page.getByRole("option", { name: "Autre" }).click();
        await dialog.getByLabel(/description/i).fill("Description de test E2E");
        await dialog.getByRole("button", { name: /créer/i }).click();
        await expect(dialog).not.toBeVisible({ timeout: 5000 });
        await page.getByPlaceholder("Rechercher par nom").fill(original);
        await expect(page.getByText(original)).toBeVisible({ timeout: 5000 });

        const row = page.getByRole("row").filter({ hasText: original });
        await row.getByRole("button", { name: /modifier/i }).click();
        const editDialog = page.getByRole("dialog");
        await editDialog.getByLabel(/nom/i).clear();
        await editDialog.getByLabel(/nom/i).fill(updated);
        await editDialog.getByRole("button", { name: /enregistrer/i }).click();
        await expect(editDialog).not.toBeVisible({ timeout: 5000 });
        await page.getByPlaceholder("Rechercher par nom").fill(updated);
        await expect(page.getByText(updated)).toBeVisible({ timeout: 5000 });
    });

    test("deletes a service", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        const name = `Service Delete ${Date.now()}`;
        await page.getByRole("button", { name: /ajouter/i }).first().click();
        const dialog = page.getByRole("dialog");
        await dialog.getByLabel(/nom/i).fill(name);
        await dialog.getByLabel(/catégorie/i).click();
        await page.getByRole("option", { name: "Autre" }).click();
        await dialog.getByLabel(/description/i).fill("Description de test E2E");
        await dialog.getByRole("button", { name: /créer/i }).click();
        await expect(dialog).not.toBeVisible({ timeout: 5000 });
        await page.getByPlaceholder("Rechercher par nom").fill(name);
        await expect(page.getByText(name)).toBeVisible({ timeout: 5000 });

        const row = page.getByRole("row").filter({ hasText: name });
        await row.getByRole("button", { name: /supprimer/i }).click();
        // confirm dialog uses the same "Supprimer" label
        await page
            .getByRole("alertdialog")
            .getByRole("button", { name: /supprimer/i })
            .click();

        // exact match skips the dialog description that repeats the name
        await expect(page.getByText(name, { exact: true })).not.toBeVisible({
            timeout: 5000,
        });
    });

    test("redirects non-admin to login", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        const email = uniqueEmail();
        const secret = await apiRegister(email);
        const tokens = await apiLogin(email, secret);
        await injectTokens(
            page,
            "http://localhost:3001",
            tokens.accessToken,
            tokens.refreshToken,
        );
        await page.goto("services");
        await expect(page).toHaveURL(/\/login/);
    });
});
