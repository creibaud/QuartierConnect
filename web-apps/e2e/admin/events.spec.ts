import { execSync } from "child_process";
import { expect, test } from "@playwright/test";
import {
    apiLogin,
    apiRegister,
    injectTokens,
    uniqueEmail,
} from "../helpers/auth";

test.use({ baseURL: process.env.PLAYWRIGHT_BASE_URL_ADMIN ?? "http://localhost:3001/" });

test.describe("Admin — Événements (CRUD)", () => {
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
            // API or Docker not available — API-dependent tests will be skipped
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
        await page.goto("events");
        await expect(page).toHaveURL(/\/events/);
    });

    test("shows events page heading", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await expect(
            page.getByRole("heading", { name: /événements/i }),
        ).toBeVisible();
    });

    test("shows add event button", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await expect(
            page.getByRole("button", { name: /créer/i }).first(),
        ).toBeVisible();
    });

    test("creates a new event", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        const title = `Événement E2E ${Date.now()}`;
        await page.getByRole("button", { name: /créer/i }).first().click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await page.getByLabel(/titre/i).fill(title);
        await page.locator("#evt-date").fill("2026-12-01T10:00");
        await page
            .locator('[data-slot="select-trigger"]')
            .filter({ hasText: /choisir une catégorie/i })
            .click();
        await page
            .getByRole("option", { name: /communauté|community/i })
            .click();
        await page.locator("#evt-desc").fill("Description de test E2E");
        await page.getByRole("button", { name: /créer/i }).last().click();
        await expect(page.getByRole("dialog")).not.toBeVisible({
            timeout: 5000,
        });
        await expect(page.getByText(title)).toBeVisible({ timeout: 5000 });
    });

    test("edits an existing event", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        const original = `Événement Edit ${Date.now()}`;
        const updated = `${original} MAJ`;

        await page.getByRole("button", { name: /créer/i }).first().click();
        await page.getByLabel(/titre/i).fill(original);
        await page.locator("#evt-date").fill("2026-12-01T10:00");
        await page
            .locator('[data-slot="select-trigger"]')
            .filter({ hasText: /choisir une catégorie/i })
            .click();
        await page
            .getByRole("option", { name: /communauté|community/i })
            .click();
        await page.locator("#evt-desc").fill("Description de test E2E");
        await page.getByRole("button", { name: /créer/i }).last().click();
        await expect(page.getByRole("dialog")).not.toBeVisible({
            timeout: 5000,
        });
        await expect(page.getByText(original)).toBeVisible({ timeout: 5000 });

        const row = page.getByRole("row").filter({ hasText: original });
        await row.getByRole("button", { name: /modifier/i }).click();
        await page.getByLabel(/titre/i).clear();
        await page.getByLabel(/titre/i).fill(updated);
        await page
            .getByRole("button", { name: /enregistrer/i })
            .last()
            .click();
        await expect(page.getByRole("dialog")).not.toBeVisible({
            timeout: 5000,
        });
        await expect(page.getByText(updated)).toBeVisible({ timeout: 5000 });
    });

    test("deletes an event", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        const title = `Événement Delete ${Date.now()}`;
        await page.getByRole("button", { name: /créer/i }).first().click();
        await page.getByLabel(/titre/i).fill(title);
        await page.locator("#evt-date").fill("2026-12-01T10:00");
        await page
            .locator('[data-slot="select-trigger"]')
            .filter({ hasText: /choisir une catégorie/i })
            .click();
        await page
            .getByRole("option", { name: /communauté|community/i })
            .click();
        await page.locator("#evt-desc").fill("Description de test E2E");
        await page.getByRole("button", { name: /créer/i }).last().click();
        await expect(page.getByRole("dialog")).not.toBeVisible({
            timeout: 5000,
        });
        await expect(page.getByText(title)).toBeVisible({ timeout: 5000 });

        const row = page.getByRole("row").filter({ hasText: title });
        await row.getByRole("button", { name: /supprimer/i }).click();
        const confirmBtn = page.getByRole("button", {
            name: /confirmer|oui|yes/i,
        });
        if (await confirmBtn.isVisible({ timeout: 500 }))
            await confirmBtn.click();

        await expect(page.getByText(title)).not.toBeVisible({ timeout: 5000 });
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
        await page.goto("events");
        await expect(page).toHaveURL(/\/login/);
    });
});
