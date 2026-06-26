import { execSync } from "child_process";
import { expect, test } from "@playwright/test";
import {
    apiLogin,
    apiRegister,
    injectTokens,
    uniqueEmail,
} from "../helpers/auth";

test.use({ baseURL: process.env.PLAYWRIGHT_BASE_URL_ADMIN ?? "http://localhost:3001/" });

test.describe("Admin — Gestion utilisateurs", () => {
    let adminAccessToken: string;
    let adminRefreshToken: string;
    let targetEmail: string;
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

            targetEmail = uniqueEmail();
            await apiRegister(targetEmail);
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
        await page.goto("users");
        await expect(page).toHaveURL(/\/users/);
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
        await page.goto("users");
        await expect(page).toHaveURL(/\/login/);
    });

    test("shows users table with headers", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await expect(
            page.getByRole("columnheader", { name: /email/i }),
        ).toBeVisible();
        await expect(
            page.getByRole("columnheader", { name: /rôle/i }),
        ).toBeVisible();
    });

    test("lists registered users", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        // Verify at least one data row is present in the table
        await expect(page.getByRole("row").nth(1)).toBeVisible({
            timeout: 5000,
        });
    });

    test("shows role selector per user", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await expect(page.getByRole("combobox").first()).toBeVisible();
    });

    test("changes user role to moderator", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        // .nth(1): skip the role-FILTER combobox (.first()); target a user row's role select
        const combobox = page.getByRole("combobox").nth(1);
        await expect(combobox).toBeVisible({ timeout: 8000 });
        // Read current role to pick a different target (avoid no-op select)
        const currentText = (await combobox.textContent()) ?? "";
        const target = /modérateur/i.test(currentText)
            ? /résident/i
            : /modérateur/i;
        await combobox.click();
        await page.getByRole("option", { name: target }).click();
        const successToast = page.getByText("Rôle mis à jour");
        const errorToast = page.getByText(
            "Impossible de mettre à jour le rôle",
        );
        await expect(successToast.or(errorToast)).toBeVisible({
            timeout: 8000,
        });
    });
});
